# Router for the assistant chat. Mounted under /api/assistant in api/index.py.
#
#   GET  /api/assistant/config  models, tools and the default system prompt
#                               the UI starts from
#   POST /api/assistant/chat    streams one assistant turn (assistant-ui
#                               "data stream" transport; chat state lives in
#                               the browser and is sent back every request)
#
# Nothing here injects a prompt: the system prompt, model and enabled tools
# all come from the request. Failures after the request is accepted (unknown
# model, missing API key, provider errors) are reported on the assistant
# message in the stream so the UI shows them in the thread.

import copy
import uuid
from typing import Any

from assistant_stream import RunController, create_run
from assistant_stream.serialization import DataStreamResponse
from fastapi import APIRouter, HTTPException
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field, field_validator

from . import registry
from .history import state_to_messages
from .stream import AssistantTurnWriter
from .tools import describe_tools, select_tools

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

RECURSION_LIMIT = 15

# Per-request bounds. The endpoint spends the server's API keys, so a request
# can't be arbitrarily large (on top of the platform's own body-size limit).
MAX_STATE_MESSAGES = 100
MAX_COMMANDS = 10
MAX_PROMPT_CHARS = 20_000
MAX_TOOLS = 10


class Settings(BaseModel):
    model: str | None = None
    systemPrompt: str = Field(default="", max_length=MAX_PROMPT_CHARS)
    tools: list[str] = Field(default_factory=list, max_length=MAX_TOOLS)


class ChatRequest(BaseModel):
    state: dict[str, Any] | None = None
    commands: list[dict[str, Any]] = Field(default_factory=list, max_length=MAX_COMMANDS)
    settings: Settings = Field(default_factory=Settings)

    @field_validator("state")
    @classmethod
    def _bounded_history(cls, state: dict[str, Any] | None) -> dict[str, Any] | None:
        if state and len(state.get("messages", [])) > MAX_STATE_MESSAGES:
            raise ValueError(
                f"The conversation is too long (more than {MAX_STATE_MESSAGES} messages). Start a new chat."
            )
        return state


@router.get("/config")
def get_config() -> dict[str, Any]:
    return {
        "defaultModel": registry.default_model_id(),
        "defaultSystemPrompt": registry.default_system_prompt(),
        "models": [
            {"id": m.id, "label": m.label, "provider": m.provider, "available": registry.is_available(m)}
            for m in registry.list_models()
        ],
        "tools": describe_tools(),
    }


def _user_text(command: dict[str, Any]) -> str:
    message = command.get("message") or {}
    return "\n".join(p["text"] for p in message.get("parts", []) if p.get("type") == "text" and p.get("text")).strip()


def _new_id() -> str:
    return uuid.uuid4().hex


@router.post("/chat")
async def chat(req: ChatRequest):
    user_texts = [t for c in req.commands if c.get("type") == "add-message" and (t := _user_text(c))]
    if not user_texts:
        raise HTTPException(status_code=400, detail="No user message to respond to.")

    state = req.state or {}
    state.setdefault("messages", [])
    # Snapshot the prior conversation before the run mutates the shared state.
    history = state_to_messages(copy.deepcopy(state))
    history += [HumanMessage(content=t) for t in user_texts]
    system_prompt = req.settings.systemPrompt.strip()

    async def run(controller: RunController) -> None:
        for text in user_texts:
            controller.state["messages"].append({"id": _new_id(), "role": "user", "text": text})
        controller.state["messages"].append({"id": _new_id(), "role": "assistant", "status": "running", "parts": []})
        assistant_index = len(controller.state["messages"]) - 1
        writer = AssistantTurnWriter(controller, assistant_index)
        status, error = "complete", None
        try:
            model = registry.build_model(registry.get_spec(req.settings.model))
            agent = create_agent(model, select_tools(req.settings.tools), system_prompt=system_prompt or None)
            async for message, metadata in agent.astream(
                {"messages": history},
                config={"recursion_limit": RECURSION_LIMIT},
                stream_mode="messages",
            ):
                if controller.is_cancelled:
                    status = "cancelled"
                    break
                writer.on_message(message, metadata)
        except registry.ModelConfigError as err:
            status, error = "error", str(err)
        except Exception as err:  # shown in the UI, not swallowed
            status, error = "error", f"{type(err).__name__}: {err}"
        finally:
            writer.finish()
            assistant = controller.state["messages"][assistant_index]
            if error:
                assistant["error"] = error
            assistant["status"] = status

    return DataStreamResponse(create_run(run, state=state))
