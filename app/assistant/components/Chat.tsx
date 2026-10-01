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
      <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl bg-panel2 px-4 py-2 text-[15px] leading-relaxed">
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

function Welcome() {
  return (
    <div className="flex flex-1 flex-col justify-center px-2 pb-10">
      <p className="text-2xl font-medium tracking-tight">How can I help you today?</p>
      <p className="mt-2 text-sm text-muted">
        Pick a model and edit the system prompt on the right. With the calculator on, try “what is 1234 * 5678?”.
      </p>
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

          <div className="sticky bottom-0 mx-auto mt-4 flex w-full max-w-[44rem] flex-col gap-3 bg-panel pb-4">
            <ThreadPrimitive.ScrollToBottom asChild>
              <button
                type="button"
                aria-label="Scroll to bottom"
                className="absolute -top-12 z-10 self-center rounded-full border border-line bg-panel p-2 text-muted transition-colors hover:text-text disabled:invisible [&_svg]:size-4"
              >
                <ArrowDownIcon />
              </button>
            </ThreadPrimitive.ScrollToBottom>
            <ComposerPrimitive.Root className="flex flex-col gap-2 rounded-3xl border border-line bg-panel2 p-2.5 transition-colors focus-within:border-[#3a4451]">
              <ComposerPrimitive.Input
                rows={1}
                autoFocus
                placeholder="Send a message…"
                aria-label="Message input"
                enterKeyHint="send"
                className="max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 text-text caret-amber outline-hidden placeholder:text-muted"
                data-testid="composer-input"
              />
              <div className="flex justify-end">
                <ThreadPrimitive.If running={false}>
                  <ComposerPrimitive.Send
                    aria-label="Send message"
                    className="flex size-8 items-center justify-center rounded-full bg-amber text-bg transition-opacity disabled:opacity-30"
                    data-testid="send"
                  >
                    <ArrowUpIcon className="size-4" />
                  </ComposerPrimitive.Send>
                </ThreadPrimitive.If>
                <ThreadPrimitive.If running>
                  <ComposerPrimitive.Cancel
                    aria-label="Stop generating"
                    className="flex size-8 items-center justify-center rounded-full bg-text text-bg"
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
