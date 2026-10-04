# Router for the assistant chat. Mounted under /api/assistant in api/index.py.
#
#   GET  /api/assistant/config  models, tools and the default system prompt
#                               the UI starts from
#   POST /api/assistant/chat    streams one assistant turn (assistant-ui
#                               "data stream" transport; chat state lives in
#                               the browser and is sent back every request)
#
# The conversation must follow a tree in config/prompts.json unless the restriction is off (see
# prompts.py). Nothing here injects a prompt: the system prompt, model and enabled tools
# all come from the request. The chat state is a list of LangChain messages
# (assistant-ui's LangGraph transport pattern); failures after the request is
# accepted (unknown model, missing API key, provider errors) are sent as an
# error in the stream.

import asyncio
import copy
import json
import logging
import time
import uuid
from typing import Any

from assistant_stream import RunController, create_run
from assistant_stream.modules.langgraph import append_langgraph_event
from assistant_stream.serialization import AssistantTransportResponse
from fastapi import APIRouter, HTTPException
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from langchain_core.tracers.langchain import wait_for_all_tracers
from langsmith import Client
from langsmith.utils import tracing_is_enabled
from pydantic import BaseModel, Field, field_validator

from . import prompts, registry
from .tools import describe_tools, select_tools

router = APIRouter(prefix="/api/assistant", tags=["assistant"])
logger = logging.getLogger("api.assistant")

RECURSION_LIMIT = 15

# A run uploaded just before it is shared can briefly 404.
SHARE_RETRY_DELAYS = (0.5, 1, 2)  # seconds

# Per-request bounds. The endpoint spends the server's API keys, so a request
# can't be arbitrarily large (on top of the platform's own body-size limit).
MAX_STATE_MESSAGES = 100
MAX_COMMANDS = 10
MAX_PROMPT_CHARS = 20_000
MAX_STATE_CHARS = 500_000
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
        if state and len(json.dumps(state)) > MAX_STATE_CHARS:
            raise ValueError("The conversation is too large. Start a new chat.")
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
        "restrictPrompts": prompts.restricted(),
        **prompts.get_config().model_dump(exclude={"restrict"}),
    }


async def share_trace(run_id: uuid.UUID) -> str | None:
    """Public LangSmith URL of the run, or None when tracing is off or sharing fails.

    Tracing is on when LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY are set.
    Uses LangSmith's v2 share endpoint: the old `Client.share_run` (PUT /runs/{id}/share)
    answers "Run not found" for runs that exist. A failure here must never break the
    chat, so it is logged and reported as "no trace".
    """
    if not tracing_is_enabled():
        logger.info("trace not shared: tracing is off (set LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY)")
        return None
    try:
        await asyncio.to_thread(wait_for_all_tracers)  # the run is uploaded in the background
        client = Client()
        runs = await asyncio.to_thread(lambda: client.runs)  # checks the backend version over the network
        for delay in (*SHARE_RETRY_DELAYS, None):
            try:
                shared = await runs.share.create(str(run_id), trace_id=str(run_id))
                break
            except Exception as err:
                # a just-uploaded run may not be visible yet
                if delay is None or getattr(err, "status_code", None) != 404:
                    raise
                await asyncio.sleep(delay)
        url = f"{client._host_url}/public/{shared.share_token}/r"
        logger.info("trace shared", extra={"run_id": str(run_id), "trace_url": url})
        return url
    except Exception as err:
        logger.warning("could not share trace %s: %s: %s", run_id, type(err).__name__, err, exc_info=True)
        return None


def _user_text(command: dict[str, Any]) -> str:
    message = command.get("message") or {}
    return "\n".join(p["text"] for p in message.get("parts", []) if p.get("type") == "text" and p.get("text")).strip()


def _human_texts(messages: list[Any]) -> list[str]:
    """The text of each human message in a state received from the browser."""
    texts = []
    for message in messages:
        if isinstance(message, dict) and message.get("type") == "human":
            content = message.get("content")
            texts.append(
                content
                if isinstance(content, str)
                else "\n".join(b.get("text", "") for b in content or [] if isinstance(b, dict))
            )
    return texts


@router.post("/chat")
async def chat(req: ChatRequest):
    user_messages = [
        HumanMessage(content=t) for c in req.commands if c.get("type") == "add-message" and (t := _user_text(c))
    ]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user message to respond to.")

    state = req.state or {}
    # The history comes from the browser too, so it is checked the same way.
    sent = [*_human_texts(state.get("messages", [])), *(m.content for m in user_messages)]
    if not prompts.allows(sent):
        raise HTTPException(status_code=400, detail="Only the suggested prompts can be sent, in order.")
    history = copy.deepcopy(state.get("messages", []))  # the run mutates the shared state below
    # When prompts are restricted the system prompt is too: the editable one in
    # the request is ignored in favor of the server's default.
    system_prompt = (registry.default_system_prompt() if prompts.restricted() else req.settings.systemPrompt).strip()

    async def run(controller: RunController) -> None:
        started = time.perf_counter()
        outcome = "ok"
        # Metadata only: prompts and messages are user content and stay out of logs.
        logger.info(
            "chat start",
            extra={
                "model": req.settings.model,
                "tools": req.settings.tools,
                "history_messages": len(history),
                "new_messages": len(user_messages),
            },
        )
        if "messages" not in controller.state:
            controller.state["messages"] = []
        for message in user_messages:
            controller.state["messages"].append(message.model_dump())
        controller.state["traceUrl"] = None  # the state is echoed back by the browser: drop the previous turn's link
        run_id = uuid.uuid4()

        try:
            model = registry.build_model(registry.get_spec(req.settings.model))
            agent = create_agent(model, select_tools(req.settings.tools), system_prompt=system_prompt or None)
            # assistant-ui's LangGraph pattern: the chat state is LangChain's own
            # message list, and the stream is folded into it by the library.
            async for namespace, event_type, chunk in agent.astream(
                {"messages": [*history, *user_messages]},
                config={"recursion_limit": RECURSION_LIMIT, "run_id": run_id},
                stream_mode=["messages", "updates"],
                subgraphs=True,
            ):
                if controller.is_cancelled:
                    break
                append_langgraph_event(controller.state, namespace, event_type, chunk)
            if not controller.is_cancelled and (url := await share_trace(run_id)):
                controller.state["traceUrl"] = url
        except registry.ModelConfigError as err:
            outcome = "config_error"
            logger.warning("chat config error: %s", err)
            controller.add_error(str(err))
        except Exception as err:  # reported to the UI, not swallowed
            outcome = "error"
            logger.exception("chat failed")
            controller.add_error(f"{type(err).__name__}: {err}")
        finally:
            if controller.is_cancelled and outcome == "ok":
                outcome = "cancelled"
            logger.info(
                "chat end",
                extra={"outcome": outcome, "duration_ms": round((time.perf_counter() - started) * 1000, 1)},
            )

    return AssistantTransportResponse(create_run(run, state=state))
