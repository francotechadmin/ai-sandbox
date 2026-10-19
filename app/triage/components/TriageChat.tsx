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
import { convertState, humanMessages } from "@/app/assistant/lib/convert";
import { nextChoices } from "@/app/assistant/lib/prompts";
import type { AssistantConfig, ChatState, PromptInfo, Settings } from "@/app/assistant/lib/types";
import { TriageToolCall } from "./ToolCall";

function Welcome() {
  return (
    <p className="aui-thread-welcome-message-inner mb-2 px-2 text-lg font-medium tracking-tight">
      Pick a prompt and the agent works the break above.
    </p>
  );
}

const COMPONENTS: ThreadComponents = {
  Welcome,
  ReasoningGroup: ({ group, children }) => {
    const running = group.status.type === "running";
    return (
      <ReasoningRoot variant="ghost" streaming={running} defaultOpen>
        <ReasoningTrigger active={running} />
        <ReasoningContent aria-busy={running}>
          <ReasoningText>{children}</ReasoningText>
        </ReasoningContent>
      </ReasoningRoot>
    );
  },
  ToolGroup: ({ children }) => <>{children}</>,
  ToolFallback: TriageToolCall,
};

function DismissKeyboardOnSend() {
  const running = useAuiState((s) => s.thread.isRunning);
  useEffect(() => {
    if (running && window.matchMedia("(pointer: coarse)").matches)
      (document.activeElement as HTMLElement | null)?.blur();
  }, [running]);
  return null;
}

// Locked to the prompt tree when the server restricts prompts: the follow-ups
// offered after each reply are the only way to send.
function TriageThread({ config, prompts, onNewChat }: { config: AssistantConfig; prompts: PromptInfo[]; onNewChat: () => void }) {
  const messages = useAuiState((s) => s.thread.messages);
  const choices = useMemo(() => {
    const sent = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.map((part) => (part.type === "text" ? part.text : "")).join("\n"));
    return nextChoices(prompts, sent);
  }, [messages, prompts]);

  const locked = config.restrictPrompts
    ? {
        placeholder: config.placeholder,
        choices,
        end: (
          <p className="text-muted-foreground text-center text-sm">
            {config.endNote}{" "}
            <button type="button" onClick={onNewChat} className="text-foreground underline underline-offset-2">
              Open another break
            </button>
          </p>
        ),
      }
    : undefined;
  return <Thread components={COMPONENTS} locked={locked} />;
}

// `prompts` already name the open break; remount (key) to start over on another.
export function TriageChat({
  settings,
  config,
  prompts,
  onNewChat,
}: {
  settings: Settings;
  config: AssistantConfig;
  prompts: PromptInfo[];
  onNewChat: () => void;
}) {
  const auiConfig = useMemo(
    () => AuiConfig({ suggestions: Suggestions(prompts.map((p) => ({ title: p.title, label: p.label ?? "", prompt: p.prompt }))) }),
    [prompts],
  );

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [error, setError] = useState<string | null>(null);

  const runtime = useAssistantTransportRuntime<ChatState>({
    initialState: { messages: [], traceUrl: null },
    protocol: "assistant-transport",
    api: "/api/assistant/chat",
    headers: {},
    body: async () => ({ settings: { ...settingsRef.current, agent: config.agent } }),
    converter: (state, meta) => convertState(state, meta, error),
    onResponse: () => setError(null),
    onError: (err, { commands, updateState }) => {
      setError(err.message);
      updateState((state) => ({ ...state, messages: [...state.messages, ...humanMessages(commands)] }));
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={auiConfig}>
      <DismissKeyboardOnSend />
      <TriageThread config={config} prompts={prompts} onNewChat={onNewChat} />
    </AssistantRuntimeProvider>
  );
}
