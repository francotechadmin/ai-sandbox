"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { nextChoices } from "../lib/prompts";
import type { AssistantConfig, ChatState, Settings } from "../lib/types";

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

// The thread, locked to the prompt trees when the server restricts prompts.
function ChatThread({ config, onNewChat }: { config: AssistantConfig; onNewChat: () => void }) {
  const messages = useAuiState((s) => s.thread.messages);
  const choices = useMemo(() => {
    const sent = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.map((part) => (part.type === "text" ? part.text : "")).join("\n"));
    return nextChoices(config.prompts, sent);
  }, [messages, config.prompts]);

  const locked = config.restrictPrompts
    ? {
        placeholder: config.placeholder,
        choices,
        end: (
          <p className="text-muted-foreground text-center text-sm">
            {config.endNote}{" "}
            <button type="button" onClick={onNewChat} className="text-foreground underline underline-offset-2">
              Start a new chat
            </button>
          </p>
        ),
      }
    : undefined;
  return <Thread components={components} locked={locked} />;
}

export function Chat({ settings, config, onNewChat }: { settings: Settings; config: AssistantConfig; onNewChat: () => void }) {
  // The opening prompts are listed in an empty chat; follow-ups are chips (see ChatThread).
  const auiConfig = useMemo(() => AuiConfig({ suggestions: Suggestions(config.prompts.map((p) => ({ title: p.title, label: p.label ?? "", prompt: p.prompt }))) }), [config.prompts]);
  // The runtime is created once; the latest settings are read per request.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [error, setError] = useState<string | null>(null);

  const runtime = useAssistantTransportRuntime<ChatState>({
    initialState: { messages: [], traceUrl: null },
    protocol: "assistant-transport",
    api: "/api/assistant/chat",
    headers: {}, // required by the options type
    body: async () => ({ settings: { ...settingsRef.current, agent: config.agent } }),
    converter: (state, meta) => convertState(state, meta, error),
    onResponse: () => setError(null),
    // Show why the request failed and keep what the user typed.
    onError: (err, { commands, updateState }) => {
      setError(err.message);
      updateState((state) => ({ ...state, messages: [...state.messages, ...humanMessages(commands)] }));
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={auiConfig}>
      <DismissKeyboardOnSend />
      <ChatThread config={config} onNewChat={onNewChat} />
    </AssistantRuntimeProvider>
  );
}
