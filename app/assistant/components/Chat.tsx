"use client";

import { useEffect, useRef } from "react";
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantTransportRuntime,
} from "@assistant-ui/react";
import { convertState } from "../lib/convert";
import type { ChatState, Settings, StateMessage } from "../lib/types";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, CopyIcon, SquareIcon } from "lucide-react";
import { Markdown } from "./Markdown";
import { ReasoningPart, ToolCallPart } from "./Parts";

const EMPTY: ChatState = { messages: [] };

function errorText(error: Error): string {
  // The transport reports HTTP failures as "…: {json body}"; surface the
  // backend's own `detail` when present.
  const match = error.message.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const body = JSON.parse(match[0]) as { detail?: unknown };
      if (typeof body.detail === "string") return body.detail;
    } catch {
      /* fall through */
    }
  }
  return error.message;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end px-2" data-testid="user-message">
      <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-3xl bg-white/[0.07] px-4.5 py-2.5 text-[15px] leading-relaxed">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="px-2" data-testid="assistant-message">
      <div className="break-words text-[15px] leading-relaxed">
        <MessagePrimitive.Parts
          components={{
            Text: Markdown,
            Reasoning: ReasoningPart,
            tools: { Fallback: ToolCallPart },
          }}
        />
        <MessagePrimitive.Error>
          <div
            className="mt-2 rounded-lg border border-[#4a2a26] bg-[#301c1a] px-3 py-2 text-[13px] text-red"
            data-testid="message-error"
          >
            <ErrorPrimitive.Message />
          </div>
        </MessagePrimitive.Error>
      </div>
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        className="-ms-1 mt-1 flex gap-1 text-muted"
      >
        <ActionBarPrimitive.Copy asChild>
          <button
            type="button"
            aria-label="Copy message"
            title="Copy"
            className="rounded-md p-1.5 transition-colors hover:bg-panel2 hover:text-text [&_svg]:size-4"
          >
            <AuiIf condition={(s) => s.message.isCopied}>
              <CheckIcon />
            </AuiIf>
            <AuiIf condition={(s) => !s.message.isCopied}>
              <CopyIcon />
            </AuiIf>
          </button>
        </ActionBarPrimitive.Copy>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

const STARTERS = [
  "What's the weather in Houston right now?",
  "Walk me through a plan to migrate a Postgres database.",
  "Explain how reasoning models differ from regular ones.",
];

function Welcome() {
  return (
    <div className="flex flex-1 flex-col justify-center px-2 pb-10">
      <h2 className="text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.04em]">
        What should we work on?
      </h2>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
        Pick a model and edit the system prompt in settings. Reasoning and tool calls show up as they happen.
      </p>
      <div className="mt-7 flex flex-col items-start gap-2">
        {STARTERS.map((prompt) => (
          <ThreadPrimitive.Suggestion
            key={prompt}
            prompt={prompt}
            send
            className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-start text-[14px] text-text/85 transition-colors hover:border-white/30 hover:bg-white/[0.07]"
          >
            {prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

export function Chat({ settings }: { settings: Settings }) {
  // The runtime is created once; the latest settings are read per request.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const runtime = useAssistantTransportRuntime<ChatState>({
    initialState: EMPTY,
    api: "/api/assistant/chat",
    headers: {},
    body: async () => ({ settings: settingsRef.current }),
    converter: convertState,
    onError: (error, { commands, updateState }) => {
      // Keep what the user typed and show the failure in the thread.
      updateState((s) => {
        const users: StateMessage[] = commands.flatMap((c, i) =>
          c.type === "add-message"
            ? [
                {
                  id: `local-user-${Date.now()}-${i}`,
                  role: "user" as const,
                  text: c.message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n"),
                },
              ]
            : [],
        );
        return {
          ...s,
          messages: [
            ...s.messages,
            ...users,
            {
              id: `local-error-${Date.now()}`,
              role: "assistant" as const,
              status: "error" as const,
              parts: [],
              error: errorText(error),
            },
          ],
        };
      });
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col">
        <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto scroll-smooth px-3 pt-4 sm:px-5 sm:pt-6">
          <div className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col gap-6">
            <ThreadPrimitive.Empty>
              <Welcome />
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages>
              {({ message }) => (message.role === "user" ? <UserMessage /> : <AssistantMessage />)}
            </ThreadPrimitive.Messages>
          </div>

          <div className="sticky bottom-0 mx-auto mt-4 flex w-full max-w-[44rem] flex-col gap-3 bg-bg pb-4">
            <ThreadPrimitive.ScrollToBottom asChild>
              <button
                type="button"
                aria-label="Scroll to bottom"
                className="absolute -top-12 z-10 self-center rounded-full border border-line bg-panel p-2 text-muted transition-colors hover:text-text disabled:invisible [&_svg]:size-4"
              >
                <ArrowDownIcon />
              </button>
            </ThreadPrimitive.ScrollToBottom>
            <ComposerPrimitive.Root className="flex flex-col gap-2 rounded-3xl border border-white/12 bg-white/[0.04] p-2.5 backdrop-blur-md transition-colors focus-within:border-white/30">
              <ComposerPrimitive.Input
                rows={1}
                autoFocus
                placeholder="Send a message…"
                aria-label="Message input"
                enterKeyHint="send"
                className="max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 text-text caret-text outline-hidden placeholder:text-muted"
                data-testid="composer-input"
              />
              <div className="flex justify-end">
                <ThreadPrimitive.If running={false}>
                  <ComposerPrimitive.Send
                    aria-label="Send message"
                    className="flex size-9 items-center justify-center rounded-full bg-text text-bg transition-opacity disabled:opacity-25"
                    data-testid="send"
                  >
                    <ArrowUpIcon className="size-4" />
                  </ComposerPrimitive.Send>
                </ThreadPrimitive.If>
                <ThreadPrimitive.If running>
                  <ComposerPrimitive.Cancel
                    aria-label="Stop generating"
                    className="flex size-9 items-center justify-center rounded-full bg-text text-bg"
                    data-testid="stop"
                  >
                    <SquareIcon className="size-3.5 fill-current" />
                  </ComposerPrimitive.Cancel>
                </ThreadPrimitive.If>
              </div>
            </ComposerPrimitive.Root>
          </div>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
