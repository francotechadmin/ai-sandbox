"use client";

import { useState } from "react";
import type { ReasoningMessagePartComponent, TextMessagePartComponent, ToolCallMessagePartComponent } from "@assistant-ui/react";

export const TextPart: TextMessagePartComponent = ({ text }) => (
  <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{text}</p>
);

// Open while the model is thinking, collapses once it moves on.
export const ReasoningPart: ReasoningMessagePartComponent = ({ text, status }) => {
  const running = status.type === "running";
  // Follows `running` (open while thinking, collapsed after) until the user
  // toggles it by hand.
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? running;
  return (
    <details
      open={open}
      onToggle={(e) => {
        const el = e.currentTarget as HTMLDetailsElement;
        if (el.open !== open) setUserOpen(el.open);
      }}
      className="rounded-lg border border-line bg-panel2/60 px-3 py-2 text-[12px] text-muted"
      data-testid="reasoning"
    >
      <summary className="cursor-pointer select-none font-medium uppercase tracking-wide text-[11px]">
        {running ? "Thinking…" : "Reasoning"}
      </summary>
      <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{text}</p>
    </details>
  );
};

const TOOL_DOT = {
  running: "bg-amber animate-pulse",
  complete: "bg-green",
  error: "bg-red",
} as const;

export const ToolCallPart: ToolCallMessagePartComponent = ({ toolName, args, result, isError }) => {
  const state = isError ? "error" : result === undefined ? "running" : "complete";
  return (
    <div className="rounded-lg border border-line bg-panel2/60 px-3 py-2 text-[12px]" data-testid="tool-call">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${TOOL_DOT[state]}`} />
        <span className="font-mono text-[12px] text-[#7db3d8]">{toolName}</span>
        <span className="text-muted">{state === "running" ? "running…" : state === "error" ? "failed" : "done"}</span>
      </div>
      <pre className="mt-1.5 overflow-x-auto font-mono text-[11px] text-muted">{JSON.stringify(args)}</pre>
      {result !== undefined && (
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-text" data-testid="tool-result">
          {typeof result === "string" ? result : JSON.stringify(result)}
        </pre>
      )}
    </div>
  );
};
