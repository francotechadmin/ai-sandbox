"use client";

import {
  ActionBarPrimitive,
  AuiIf,
  MessagePrimitive,
} from "@assistant-ui/react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Markdown } from "./Markdown";
import { ReasoningPart, ToolCallPart } from "./Parts";

export function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end px-2" data-testid="user-message">
      <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-3xl bg-white/[0.07] px-4.5 py-2.5 text-[15px] leading-relaxed">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

export function AssistantMessage() {
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
      </div>
      <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className="-ms-1 mt-1 flex gap-1 text-muted">
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
