# Conversation state <-> LangChain messages.
#
# The chat state the browser holds (and sends back every request, so the
# backend stays stateless) is provider-neutral:
#   {"messages": [
#       {"id", "role": "user", "text"},
#       {"id", "role": "assistant", "status", "parts": [
#           {"type": "reasoning", "step", "text"},
#           {"type": "text", "step", "text"},
#           {"type": "tool-call", "step", "toolCallId", "toolName", "args",
#            "status", "result"}]}]}
# `step` numbers the model calls inside one assistant turn so a tool loop can
# be replayed to the model as separate AI/tool messages. Reasoning is display
# only and is never sent back to the model.

from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage


def state_to_messages(state: dict[str, Any]) -> list[BaseMessage]:
    messages: list[BaseMessage] = []
    for m in state.get("messages", []):
        if m.get("role") == "user":
            messages.append(HumanMessage(content=m.get("text", "")))
            continue
        if m.get("role") != "assistant":
            continue

        steps: dict[int, list[dict[str, Any]]] = {}
        for part in m.get("parts", []):
            steps.setdefault(int(part.get("step", 0)), []).append(part)

        for step in sorted(steps):
            parts = steps[step]
            text = "".join(p.get("text", "") for p in parts if p.get("type") == "text")
            calls = [p for p in parts if p.get("type") == "tool-call"]
            if not text and not calls:
                continue
            messages.append(
                AIMessage(
                    content=text,
                    tool_calls=[
                        {"id": c["toolCallId"], "name": c["toolName"], "args": c.get("args") or {}} for c in calls
                    ],
                )
            )
            for c in calls:
                # Every tool call needs a matching result or providers reject
                # the history; an interrupted call is reported as such.
                result = c.get("result")
                messages.append(
                    ToolMessage(
                        content="Tool call did not complete." if result is None else str(result),
                        tool_call_id=c["toolCallId"],
                        name=c["toolName"],
                    )
                )
    return messages
