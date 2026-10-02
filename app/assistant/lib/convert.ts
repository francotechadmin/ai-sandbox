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

export function convertState(state: ChatState, meta: AssistantTransportConnectionMetadata) {
  return {
    messages: messageConverter.toThreadMessages([...state.messages, ...humanMessages(meta.pendingCommands)]),
    isRunning: meta.isSending,
  };
}
