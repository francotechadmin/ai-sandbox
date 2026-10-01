# Turns a LangGraph agent's "messages" stream into updates on the shared chat
# state. Provider differences (Anthropic "thinking" blocks, OpenAI reasoning
# summaries, tool-call chunks) are erased here using LangChain's standard
# content blocks, so the frontend only ever sees reasoning / text / tool-call
# parts.

from typing import Any

from assistant_stream import RunController
from langchain_core.messages import AIMessageChunk, BaseMessage, ToolMessage


class AssistantTurnWriter:
    """Writes one assistant message (`state.messages[message_index]`) as chunks arrive."""

    def __init__(self, controller: RunController, message_index: int):
        self.controller = controller
        self.message_index = message_index
        self.part_count = 0
        self.step = -1  # index of the current model call within this turn
        self.step_key: Any = object()  # identifies the current model call
        self.part_by_block: dict[tuple[str, Any], int] = {}  # (kind, block index) -> part index
        self.step_tool_parts: list[int] = []  # part indexes of this step's tool calls
        self.tool_part_by_id: dict[str, int] = {}  # toolCallId -> part index (all steps)
        self.step_message: AIMessageChunk | None = None  # this step's chunks, merged

    # -- helpers -----------------------------------------------------------
    def _parts(self):
        return self.controller.state["messages"][self.message_index]["parts"]

    def _add_part(self, part: dict[str, Any]) -> int:
        self._parts().append(part)
        self.part_count += 1
        return self.part_count - 1

    def _append_text(self, part_index: int, delta: str) -> None:
        self.controller.append_state_text(["messages", self.message_index, "parts", part_index, "text"], delta)

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
        step_key = graph_step if graph_step is not None else chunk.id
        if step_key != self.step_key:
            self._finish_step()
            self.step += 1
            self.step_key = step_key
            self.part_by_block = {}
        self.step_message = chunk if self.step_message is None else self.step_message + chunk

        for block in chunk.content_blocks:
            kind = block.get("type")
            if kind in ("reasoning", "text"):
                delta = block.get("reasoning" if kind == "reasoning" else "text") or ""
                if not delta:
                    continue
                slot = (kind, block.get("index"))
                if slot in self.part_by_block:
                    self._append_text(self.part_by_block[slot], delta)
                else:
                    self.part_by_block[slot] = self._add_part({"type": kind, "step": self.step, "text": delta})
            elif kind in ("tool_call_chunk", "tool_call"):
                slot = ("tool", block.get("index", block.get("id")))
                if slot in self.part_by_block or not (block.get("name") or block.get("id")):
                    continue
                part_index = self._add_part(
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
                self.part_by_block[slot] = part_index
                self.step_tool_parts.append(part_index)

    def _finish_step(self) -> None:
        """Settle tool-call ids/args from the fully merged model message."""
        if self.step_message is None:
            return
        for part_index, call in zip(self.step_tool_parts, self.step_message.tool_calls, strict=False):
            part = self._parts()[part_index]
            part["toolCallId"] = call["id"]
            part["toolName"] = call["name"]
            part["args"] = call["args"]
            self.tool_part_by_id[call["id"]] = part_index
        self.step_message = None
        self.step_tool_parts = []

    def _on_tool_message(self, message: ToolMessage) -> None:
        self._finish_step()
        part_index = self.tool_part_by_id.get(message.tool_call_id)
        if part_index is None:
            return
        part = self._parts()[part_index]
        part["result"] = message.text
        part["status"] = "error" if message.status == "error" else "complete"

    def finish(self) -> None:
        self._finish_step()
