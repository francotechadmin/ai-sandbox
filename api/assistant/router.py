# Router for the assistant chat. Mounted under /api/assistant in api/index.py.
#
#   GET  /api/assistant/config  models, tools and the default system prompt
#                               the UI starts from
#   POST /api/assistant/chat    streams one assistant turn (assistant-ui
#                               "data stream" transport; chat state lives in
#                               the browser and is sent back every request)
#
# Nothing here injects a prompt: the system prompt, model and enabled tools
# all come from the request. The chat state is a list of LangChain messages
# (assistant-ui's LangGraph transport pattern); failures after the request is
# accepted (unknown model, missing API key, provider errors) are sent as an
# error in the stream.

import copy
from typing import Any

from assistant_stream import RunController, create_run
from assistant_stream.modules.langgraph import append_langgraph_event
from assistant_stream.serialization import AssistantTransportResponse
from fastapi import APIRouter, HTTPException
from langchain.agents import create_agent
from langchain_core.messages import AIMessageChunk, BaseMessage, HumanMessage
from pydantic import BaseModel, Field, field_validator

from . import registry
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


def _is_usage_only(message: BaseMessage) -> bool:
    # Anthropic ends each reply with a chunk that carries only token usage and
    # no message id, which would otherwise show up as an empty extra message.
    return isinstance(message, AIMessageChunk) and not message.content and not message.tool_call_chunks


@router.post("/chat")
async def chat(req: ChatRequest):
    user_messages = [
        HumanMessage(content=t) for c in req.commands if c.get("type") == "add-message" and (t := _user_text(c))
    ]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user message to respond to.")

    state = req.state or {}
    history = copy.deepcopy(state.get("messages", []))  # the run mutates the shared state below
    system_prompt = req.settings.systemPrompt.strip()

    async def run(controller: RunController) -> None:
        if "messages" not in controller.state:
            controller.state["messages"] = []
        for message in user_messages:
            controller.state["messages"].append(message.model_dump())

        try:
            model = registry.build_model(registry.get_spec(req.settings.model))
            agent = create_agent(model, select_tools(req.settings.tools), system_prompt=system_prompt or None)
            # assistant-ui's LangGraph pattern: the chat state is LangChain's own
            # message list, and the stream is folded into it by the library.
            async for namespace, event_type, chunk in agent.astream(
                {"messages": [*history, *user_messages]},
                config={"recursion_limit": RECURSION_LIMIT},
                stream_mode=["messages", "updates"],
                subgraphs=True,
            ):
                if controller.is_cancelled:
                    break
                if event_type == "messages" and _is_usage_only(chunk[0]):
                    continue
                append_langgraph_event(controller.state, namespace, event_type, chunk)
        except registry.ModelConfigError as err:
            controller.add_error(str(err))
        except Exception as err:  # reported to the UI, not swallowed
            controller.add_error(f"{type(err).__name__}: {err}")

    return AssistantTransportResponse(create_run(run, state=state))
