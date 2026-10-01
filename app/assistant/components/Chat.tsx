"use client";

import { useEffect, useRef } from "react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAssistantTransportRuntime,
} from "@assistant-ui/react";
import { convertState } from "../lib/convert";
import type { ChatState, Settings, StateMessage } from "../lib/types";
import { ReasoningPart, TextPart, ToolCallPart } from "./Parts";

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
    <MessagePrimitive.Root className="flex justify-end" data-testid="user-message">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-panel2 px-3.5 py-2 text-[14px]">
        <MessagePrimitive.Parts components={{ Text: TextPart }} />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-2" data-testid="assistant-message">
      <MessagePrimitive.Parts
        components={{
          Text: TextPart,
          Reasoning: ReasoningPart,
          tools: { Fallback: ToolCallPart },
        }}
      />
      <MessagePrimitive.Error>
        <div
          className="rounded-lg border border-[#4a2a26] bg-[#301c1a] px-3 py-2 text-[13px] text-red"
          data-testid="message-error"
        >
          <ErrorPrimitive.Message />
        </div>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
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
        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto flex max-w-[760px] flex-col gap-4">
            <ThreadPrimitive.Empty>
              <div className="py-16 text-center text-sm text-muted">
                Ask anything. With the calculator enabled, try “what is 1234 * 5678?”.
              </div>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages>
              {({ message }) => (message.role === "user" ? <UserMessage /> : <AssistantMessage />)}
            </ThreadPrimitive.Messages>
          </div>
        </ThreadPrimitive.Viewport>

        <div className="border-t border-line px-5 py-3">
          <ComposerPrimitive.Root className="mx-auto flex max-w-[760px] items-end gap-2 rounded-xl border border-line bg-panel px-3 py-2 focus-within:border-[#3a4451]">
            <ComposerPrimitive.Input
              rows={1}
              autoFocus
              placeholder="Message the assistant…"
              className="max-h-40 flex-1 resize-none bg-transparent py-1 text-[14px] text-text outline-hidden placeholder:text-muted"
              data-testid="composer-input"
            />
            <ThreadPrimitive.If running={false}>
              <ComposerPrimitive.Send
                className="rounded-lg bg-amber/90 px-3 py-1.5 text-[13px] font-semibold text-bg disabled:opacity-40"
                data-testid="send"
              >
                Send
              </ComposerPrimitive.Send>
            </ThreadPrimitive.If>
            <ThreadPrimitive.If running>
              <ComposerPrimitive.Cancel
                className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-semibold text-text"
                data-testid="stop"
              >
                Stop
              </ComposerPrimitive.Cancel>
            </ThreadPrimitive.If>
          </ComposerPrimitive.Root>
        </div>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
