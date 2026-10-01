import {
  fromThreadMessageLike,
  type AssistantTransportConnectionMetadata,
} from "@assistant-ui/react";
import type { ChatState, StateMessage } from "./types";

type Status = Parameters<typeof fromThreadMessageLike>[2];
type Like = Parameters<typeof fromThreadMessageLike>[0];

const COMPLETE: Status = { type: "complete", reason: "stop" };

function assistantStatus(m: Extract<StateMessage, { role: "assistant" }>): Status {
  switch (m.status) {
    case "running":
      return { type: "running" };
    case "cancelled":
      return { type: "incomplete", reason: "cancelled" };
    case "error":
      return { type: "incomplete", reason: "error", error: m.error ?? "The request failed." };
    default:
      return COMPLETE;
  }
}

function toLike(m: StateMessage): Like {
  if (m.role === "user") return { role: "user", content: [{ type: "text", text: m.text }] };
  return {
    role: "assistant",
    content: m.parts.map((p) => {
      if (p.type === "reasoning") return { type: "reasoning" as const, text: p.text };
      if (p.type === "text") return { type: "text" as const, text: p.text };
      return {
        type: "tool-call" as const,
        toolCallId: p.toolCallId,
        toolName: p.toolName,
        args: p.args as never,
        argsText: JSON.stringify(p.args),
        // Left undefined until the tool has run so the card shows "running".
        ...(p.result === null ? {} : { result: p.result }),
        isError: p.status === "error",
      };
    }),
  };
}

// Maps the backend's chat state (plus the not-yet-confirmed user message) to
// assistant-ui messages.
export function convertState(
  state: ChatState,
  meta: AssistantTransportConnectionMetadata,
) {
  const messages = state.messages.map((m) =>
    fromThreadMessageLike(toLike(m), m.id, m.role === "assistant" ? assistantStatus(m) : COMPLETE),
  );

  const pending = meta.pendingCommands.flatMap((c, i) =>
    c.type === "add-message"
      ? [
          fromThreadMessageLike(
            {
              role: "user",
              content: c.message.parts.flatMap((p) =>
                p.type === "text" ? [{ type: "text" as const, text: p.text }] : [],
              ),
            },
            `pending-${i}`,
            COMPLETE,
          ),
        ]
      : [],
  );
  messages.push(...pending);

  // Until the backend streams its first update, show an empty running reply.
  if (meta.isSending && messages[messages.length - 1]?.role === "user") {
    messages.push(fromThreadMessageLike({ role: "assistant", content: [] }, "pending-reply", { type: "running" }));
  }

  return { messages, isRunning: meta.isSending };
}
