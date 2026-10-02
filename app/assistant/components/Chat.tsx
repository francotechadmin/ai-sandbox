"use client";

import { useEffect, useRef, useState } from "react";
import { AssistantRuntimeProvider, useAssistantTransportRuntime } from "@assistant-ui/react";
import { convertState, humanMessages } from "../lib/convert";
import type { ChatState, Settings } from "../lib/types";
import { Thread } from "./Thread";

export function Chat({ settings }: { settings: Settings }) {
  // The runtime is created once; the latest settings are read per request.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  const [error, setError] = useState<string | null>(null);

  const runtime = useAssistantTransportRuntime<ChatState>({
    initialState: { messages: [] },
    protocol: "assistant-transport",
    api: "/api/assistant/chat",
    headers: {}, // required by the options type
    body: async () => ({ settings: settingsRef.current }),
    converter: convertState,
    onResponse: () => setError(null),
    // Keep what the user typed and show why the request failed.
    onError: (err, { commands, updateState }) => {
      setError(err.message);
      updateState((state) => ({ messages: [...state.messages, ...humanMessages(commands)] }));
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread error={error} />
    </AssistantRuntimeProvider>
  );
}
