# Turns a LangGraph agent's "messages" stream into updates on the shared chat
# state. Provider differences (Anthropic "thinking" blocks, OpenAI reasoning
# summaries, tool-call chunks) are erased here using LangChain's standard
# content blocks, so the frontend only ever sees reasoning / text / tool-call
# parts.

import uuid
from typing import Any

from langchain_core.messages import AIMessageChunk, BaseMessage, ToolMessage

from .history import message_text


class AssistantTurnWriter:
    def __init__(self, controller, message_index: int):
        self.c = controller
        self.mi = message_index
        self.n_parts = 0
        self.step = -1
        self.step_key: Any = object()
        self.keys: dict[tuple[str, Any], int] = {}
        self.tool_parts: list[int] = []  # part indexes of this step's tool calls
        self.tool_index: dict[str, int] = {}  # toolCallId -> part index (all steps)
        self.acc: AIMessageChunk | None = None

    # -- helpers -----------------------------------------------------------
    def _parts(self):
        return self.c.state["messages"][self.mi]["parts"]

    def _add_part(self, part: dict[str, Any]) -> int:
        self._parts().append(part)
        self.n_parts += 1
        return self.n_parts - 1

    def _append_text(self, part_index: int, delta: str) -> None:
        self.c.append_state_text(["messages", self.mi, "parts", part_index, "text"], delta)

    # -- stream input ------------------------------------------------------
    def on_message(self, message: BaseMessage, metadata: dict[str, Any] | None = None) -> None:
        if isinstance(message, ToolMessage):
            self._on_tool_message(message)
        elif isinstance(message, AIMessageChunk):
            self._on_chunk(message, (metadata or {}).get("langgraph_step"))

    def _on_chunk(self, chunk: AIMessageChunk, graph_step: Any) -> None:
        # One model call == one LangGraph superstep. Chunk ids are not a
        # reliable key: LangChain tags the trailing chunk of a call with its
        # own run id, which differs from the provider's message id.
        key = graph_step if graph_step is not None else chunk.id
        if key != self.step_key:
            self._finish_step()
            self.step += 1
            self.step_key = key
            self.keys = {}
            self.tool_parts = []
            self.acc = None
        self.acc = chunk if self.acc is None else self.acc + chunk

        for block in chunk.content_blocks:
            kind = block.get("type")
            if kind in ("reasoning", "text"):
                delta = block.get("reasoning" if kind == "reasoning" else "text") or ""
                if not delta:
                    continue
                slot = (kind, block.get("index"))
                if slot in self.keys:
                    self._append_text(self.keys[slot], delta)
                else:
                    self.keys[slot] = self._add_part(
                        {"type": kind, "step": self.step, "text": delta}
                    )
            elif kind in ("tool_call_chunk", "tool_call"):
                slot = ("tool", block.get("index", block.get("id")))
                if slot in self.keys or not (block.get("name") or block.get("id")):
                    continue
                idx = self._add_part(
                    {
                        "type": "tool-call",
                        "step": self.step,
                        "toolCallId": block.get("id") or "",
                        "toolName": block.get("name") or "",
                        "args": block.get("args") if isinstance(block.get("args"), dict) else {},
                        "status": "running",
                        "result": None,
                    }
                )
                self.keys[slot] = idx
                self.tool_parts.append(idx)

    def _finish_step(self) -> None:
        """Settle tool-call ids/args from the fully accumulated model message."""
        if self.acc is None:
            return
        for part_index, call in zip(self.tool_parts, self.acc.tool_calls):
            part = self._parts()[part_index]
            part["toolCallId"] = call["id"]
            part["toolName"] = call["name"]
            part["args"] = call["args"]
            self.tool_index[call["id"]] = part_index
        self.acc = None
        self.tool_parts = []

    def _on_tool_message(self, message: ToolMessage) -> None:
        self._finish_step()
        idx = self.tool_index.get(message.tool_call_id)
        if idx is None:
            return
        part = self._parts()[idx]
        part["result"] = message_text(message.content)
        part["status"] = "error" if getattr(message, "status", None) == "error" else "complete"

    def finish(self) -> None:
        self._finish_step()


def new_id() -> str:
    return uuid.uuid4().hex
