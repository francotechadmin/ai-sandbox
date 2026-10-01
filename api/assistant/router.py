# Router for the assistant chat. Mounted under /api/assistant in api/index.py.
#
#   GET  /api/assistant/config  models, tools and the default system prompt
#                               the UI starts from
#   POST /api/assistant/chat    streams one assistant turn (assistant-ui
#                               "data stream" transport; chat state lives in
#                               the browser and is sent back every request)
#
# Nothing here injects a prompt: the system prompt, model, reasoning toggle
# and enabled tools all come from the request.

import copy
from typing import Any

from assistant_stream import RunController, create_run
from assistant_stream.serialization import DataStreamResponse
from fastapi import APIRouter, HTTPException
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from . import registry
from .history import state_to_messages
from .stream import AssistantTurnWriter, new_id
from .tools import describe_tools, select_tools

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

RECURSION_LIMIT = 15


class Settings(BaseModel):
    model: str | None = None
    reasoning: bool = True  # on whenever the model supports it
    systemPrompt: str = ""
    tools: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    state: dict[str, Any] | None = None
    commands: list[dict[str, Any]] = Field(default_factory=list)
    settings: Settings = Field(default_factory=Settings)


@router.get("/config")
def get_config() -> dict[str, Any]:
    return {
        "defaultModel": registry.default_model_id(),
        "defaultSystemPrompt": registry.default_system_prompt(),
        "models": [
            {
                "id": m.id,
                "label": m.label,
                "provider": m.provider,
                "available": registry.is_available(m),
                "supportsReasoning": m.supports_reasoning,
            }
            for m in registry.list_models()
        ],
        "tools": describe_tools(),
    }


def _user_text(command: dict[str, Any]) -> str:
    message = command.get("message") or {}
    return "\n".join(
        p["text"] for p in message.get("parts", []) if p.get("type") == "text" and p.get("text")
    ).strip()


@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        spec = registry.get_spec(req.settings.model)
        model = registry.build_model(spec, req.settings.reasoning)
    except registry.ModelConfigError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err

    user_texts = [
        t for c in req.commands if c.get("type") == "add-message" and (t := _user_text(c))
    ]
    if not user_texts:
        raise HTTPException(status_code=400, detail="No user message to respond to.")

    state = req.state if isinstance(req.state, dict) else {}
    state.setdefault("messages", [])
    # Snapshot the prior conversation before the run mutates the shared state.
    history = state_to_messages(copy.deepcopy(state))
    history += [HumanMessage(content=t) for t in user_texts]
    system_prompt = req.settings.systemPrompt.strip()

    async def run(controller: RunController) -> None:
        for text in user_texts:
            controller.state["messages"].append({"id": new_id(), "role": "user", "text": text})
        controller.state["messages"].append(
            {"id": new_id(), "role": "assistant", "status": "running", "parts": []}
        )
        assistant_index = len(controller.state["messages"]) - 1

        agent = create_agent(
            model,
            select_tools(req.settings.tools),
            system_prompt=system_prompt or None,
        )
        writer = AssistantTurnWriter(controller, assistant_index)
        status = "complete"
        try:
            async for mode, payload in agent.astream(
                {"messages": history},
                config={"recursion_limit": RECURSION_LIMIT},
                stream_mode=["messages"],
            ):
                if controller.is_cancelled:
                    status = "cancelled"
                    break
                if mode == "messages":
                    message, metadata = payload
                    writer.on_message(message, metadata)
        except Exception as err:  # noqa: BLE001 — shown in the UI, not swallowed
            status = "error"
            controller.state["messages"][assistant_index]["error"] = f"{type(err).__name__}: {err}"
        finally:
            writer.finish()
            controller.state["messages"][assistant_index]["status"] = status

    return DataStreamResponse(create_run(run, state=state))
