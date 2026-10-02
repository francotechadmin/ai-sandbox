"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ComposerPrimitive, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { ArrowDownIcon, ArrowUpIcon, SquareIcon } from "lucide-react";
import { STARTERS } from "../lib/starters";
import { AssistantMessage, UserMessage } from "./Messages";

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

const coarsePointer = "(pointer: coarse)";

function useIsTouchDevice() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(coarsePointer);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(coarsePointer).matches,
    () => false,
  );
}

function Composer() {
  // On touch devices, sending closes the on-screen keyboard so the reply is
  // visible, and the input isn't refocused when the reply starts.
  const touch = useIsTouchDevice();
  const running = useAuiState((s) => s.thread.isRunning);
  useEffect(() => {
    if (touch && running) (document.activeElement as HTMLElement | null)?.blur();
  }, [touch, running]);

  return (
    <ComposerPrimitive.Root className="flex flex-col gap-2 rounded-3xl border border-white/12 bg-white/[0.04] p-2.5 backdrop-blur-md transition-colors focus-within:border-white/30">
      <ComposerPrimitive.Input
        rows={1}
        autoFocus
        placeholder="Send a message…"
        aria-label="Message input"
        enterKeyHint="send"
        unstable_focusOnRunStart={!touch}
        unstable_focusOnScrollToBottom={!touch}
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
  );
}

export function Thread({ error }: { error: string | null }) {
  return (
    <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto scroll-smooth px-3 pt-4 sm:px-5 sm:pt-6">
        <div className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col gap-6">
          <ThreadPrimitive.Empty>
            <Welcome />
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages>
            {({ message }) => (message.role === "user" ? <UserMessage /> : <AssistantMessage />)}
          </ThreadPrimitive.Messages>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-[13px] text-red"
              data-testid="message-error"
            >
              {error}
            </div>
          )}
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
          <Composer />
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
