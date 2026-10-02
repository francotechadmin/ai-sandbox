"use client";

import { useEffect, useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  useAssistantTransportRuntime,
  useAuiState,
} from "@assistant-ui/react";
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/elements/reasoning.aui";
import { Thread, type ThreadComponents } from "@/components/assistant-ui/elements/thread.aui";
import { convertState, humanMessages } from "../lib/convert";
import { STARTERS } from "../lib/starters";
import type { ChatState, Settings } from "../lib/types";

const config = AuiConfig({
  suggestions: Suggestions(STARTERS.map((prompt) => ({ title: prompt, label: "", prompt }))),
});

// The kit's own reasoning group, using its borderless "ghost" variant.
const components: ThreadComponents = {
  ReasoningGroup: ({ group, children }) => {
    const running = group.status.type === "running";
    return (
      <ReasoningRoot variant="ghost" streaming={running}>
        <ReasoningTrigger active={running} />
        <ReasoningContent aria-busy={running}>
          <ReasoningText>{children}</ReasoningText>
        </ReasoningContent>
      </ReasoningRoot>
    );
  },
};

// Sending on a touch device closes the on-screen keyboard so the reply is visible.
function DismissKeyboardOnSend() {
  const running = useAuiState((s) => s.thread.isRunning);
  useEffect(() => {
    if (running && window.matchMedia("(pointer: coarse)").matches) (document.activeElement as HTMLElement | null)?.blur();
  }, [running]);
  return null;
}

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
    converter: (state, meta) => convertState(state, meta, error),
    onResponse: () => setError(null),
    // Show why the request failed and keep what the user typed.
    onError: (err, { commands, updateState }) => {
      setError(err.message);
      updateState((state) => ({ messages: [...state.messages, ...humanMessages(commands)] }));
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <DismissKeyboardOnSend />
      <Thread components={components} />
    </AssistantRuntimeProvider>
  );
}
