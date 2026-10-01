"use client";

import { useEffect, useRef } from "react";
import { AssistantRuntimeProvider, useAssistantTransportRuntime } from "@assistant-ui/react";
import { convertState } from "../lib/convert";
import type { ChatState, Settings } from "../lib/types";
import { Thread } from "./Thread";

const EMPTY: ChatState = { messages: [] };

export function Chat({ settings }: { settings: Settings }) {
  // The runtime is created once; the latest settings are read per request.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const runtime = useAssistantTransportRuntime<ChatState>({
    initialState: EMPTY,
    api: "/api/assistant/chat",
    headers: {}, // required by the options type
    body: async () => ({ settings: settingsRef.current }),
    converter: convertState,
    // The backend reports its own failures inside the stream. This covers the
    // request itself failing (network, rejected request): keep what the user
    // typed and show the failure in the thread.
    onError: (error, { commands, updateState }) => {
      updateState((state) => ({
        messages: [
          ...state.messages,
          ...commands.flatMap((command) =>
            command.type === "add-message"
              ? [
                  {
                    id: crypto.randomUUID(),
                    role: "user" as const,
                    text: command.message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n"),
                  },
                ]
              : [],
          ),
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            status: "error" as const,
            parts: [],
            error: error.message,
          },
        ],
      }));
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
