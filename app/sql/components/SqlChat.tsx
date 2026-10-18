"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiIf,
  Suggestions,
  ThreadPrimitive,
  useAssistantTransportRuntime,
  useAuiState,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/elements/reasoning.aui";
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui";
import { Thread, type ThreadComponents } from "@/components/assistant-ui/elements/thread.aui";
import { convertState, humanMessages } from "@/app/assistant/lib/convert";
import type { AssistantConfig, ChatState, Settings } from "@/app/assistant/lib/types";
import { InlineChart, type ChartData } from "./InlineChart";

const CreateChartTool: ToolCallMessagePartComponent = (props) => {
  if (props.status?.type !== "complete") return <ToolFallback {...props} />;

  const raw = typeof props.result === "string" ? props.result : "";
  if (raw.startsWith("Error:")) return <ToolFallback {...props} />;

  let data: ChartData | null = null;
  try {
    const parsed = JSON.parse(raw) as ChartData;
    if (Array.isArray(parsed.columns)) data = parsed;
  } catch {
    // fall through to ToolFallback
  }

  if (!data) return <ToolFallback {...props} />;
  return <InlineChart data={data} />;
};

const RunSqlTool: ToolCallMessagePartComponent = (props) => {
  const rowCount = (() => {
    if (props.status?.type !== "complete") return undefined;
    const raw = typeof props.result === "string" ? props.result : "";
    if (raw.startsWith("Error:")) return undefined;
    try {
      return (JSON.parse(raw) as { row_count?: number }).row_count;
    } catch {
      return undefined;
    }
  })();

  return (
    <ToolFallback
      {...props}
      result={
        rowCount !== undefined ? `${rowCount} rows returned` : props.result
      }
    />
  );
};

const SqlToolFallback: ToolCallMessagePartComponent = (props) => {
  if (props.toolName === "create_chart") return <CreateChartTool {...props} />;
  if (props.toolName === "run_sql_query") return <RunSqlTool {...props} />;
  return <ToolFallback {...props} />;
};

const COMPONENTS: ThreadComponents = {
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
  ToolFallback: SqlToolFallback,
};

function SqlFollowUp({
  prompts,
  onNewChat,
}: {
  prompts: AssistantConfig["prompts"];
  onNewChat: () => void;
}) {
  return (
    <AuiIf condition={(s) => !s.thread.isEmpty && !s.thread.isRunning}>
      <div className="flex flex-wrap items-center gap-2 pb-1">
        {prompts.map((p) => (
          <ThreadPrimitive.Suggestion
            key={p.prompt}
            prompt={p.prompt}
            send
            className="border-foreground/10 hover:bg-foreground/[0.03] hover:border-foreground/25 focus-visible:ring-ring/50 rounded-md border px-2.5 py-1 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-1"
          >
            {p.title}
          </ThreadPrimitive.Suggestion>
        ))}
        <button
          type="button"
          onClick={onNewChat}
          className="text-muted-foreground hover:text-foreground px-1 py-1 text-sm underline underline-offset-2 transition-colors"
        >
          New chat
        </button>
      </div>
    </AuiIf>
  );
}

function DismissKeyboardOnSend() {
  const running = useAuiState((s) => s.thread.isRunning);
  useEffect(() => {
    if (running && window.matchMedia("(pointer: coarse)").matches)
      (document.activeElement as HTMLElement | null)?.blur();
  }, [running]);
  return null;
}

export function SqlChat({
  settings,
  config,
  onNewChat,
}: {
  settings: Settings;
  config: AssistantConfig;
  onNewChat: () => void;
}) {
  const auiConfig = useMemo(
    () =>
      AuiConfig({
        suggestions: Suggestions(
          config.prompts.map((p) => ({ title: p.title, label: p.label ?? "", prompt: p.prompt })),
        ),
      }),
    [config.prompts],
  );

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

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
      <Thread
        components={COMPONENTS}
        followUp={<SqlFollowUp prompts={config.prompts} onNewChat={onNewChat} />}
      />
    </AssistantRuntimeProvider>
  );
}
