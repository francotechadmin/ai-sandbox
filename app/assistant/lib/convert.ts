import {
  type AssistantTransportConnectionMetadata,
  unstable_createMessageConverter as createMessageConverter,
} from "@assistant-ui/react";
import { convertLangChainMessages, type LangChainMessage } from "@assistant-ui/react-langgraph";
import type { ChatState } from "./types";

const messageConverter = createMessageConverter(convertLangChainMessages);

type Commands = AssistantTransportConnectionMetadata["pendingCommands"];

// The user's messages as LangChain messages: shown right away, before the
// backend has echoed them back.
export function humanMessages(commands: Commands): LangChainMessage[] {
  return commands.flatMap((command) =>
    command.type === "add-message" && command.message.role === "user"
      ? [
          {
            type: "human" as const,
            content: command.message.parts.map((part) => (part.type === "text" ? part.text : "")).join("\n"),
          },
        ]
      : [],
  );
}

// `error` is the last failed request, shown as an errored assistant message
// (the kit's thread renders those with its own error styling).
export function convertState(state: ChatState, meta: AssistantTransportConnectionMetadata, error?: string | null) {
  const messages = messageConverter.toThreadMessages([...state.messages, ...humanMessages(meta.pendingCommands)]);
  if (error && !meta.isSending) {
    messages.push({
      id: "request-error",
      role: "assistant",
      createdAt: new Date(),
      content: [],
      status: { type: "incomplete", reason: "error", error },
      metadata: { unstable_state: null, unstable_annotations: [], unstable_data: [], steps: [], custom: {} },
    });
  }
  return { messages, isRunning: meta.isSending };
}
