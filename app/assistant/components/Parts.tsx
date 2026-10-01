"use client";

import { useState } from "react";
import type { ReasoningMessagePartComponent, ToolCallMessagePartComponent } from "@assistant-ui/react";
import { BrainIcon, CheckIcon, ChevronDownIcon, LoaderIcon, WrenchIcon, XIcon } from "lucide-react";

// Open while the model is thinking, collapses once it moves on, until the user
// toggles it by hand.
export const ReasoningPart: ReasoningMessagePartComponent = ({ text, status }) => {
  const running = status.type === "running";
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? running;
  return (
    <div className="my-2 rounded-xl border border-line bg-panel/60 text-[13px]" data-testid="reasoning">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setUserOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-muted transition-colors hover:text-text"
      >
        <BrainIcon className={`size-3.5 ${running ? "animate-pulse text-amber" : ""}`} />
        <span className={running ? "shimmer font-medium" : "font-medium"}>{running ? "Thinking…" : "Reasoning"}</span>
        <ChevronDownIcon className={`ms-auto size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <p className="whitespace-pre-wrap border-t border-line px-3 py-2.5 leading-relaxed text-muted">{text}</p>
      )}
    </div>
  );
};

export const ToolCallPart: ToolCallMessagePartComponent = ({ toolName, args, result, isError }) => {
  const state = isError ? "error" : result === undefined ? "running" : "complete";
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-line bg-panel/60 text-[13px]" data-testid="tool-call">
      <div className="flex items-center gap-2 px-3 py-2">
        <WrenchIcon className="size-3.5 text-muted" />
        <span className="font-mono text-[12px] text-[#7db3d8]">{toolName}</span>
        <span className="ms-auto flex items-center gap-1.5 text-muted">
          {state === "running" && <LoaderIcon className="size-3.5 animate-spin text-amber" />}
          {state === "complete" && <CheckIcon className="size-3.5 text-green" />}
          {state === "error" && <XIcon className="size-3.5 text-red" />}
          {state === "running" ? "Running" : state === "error" ? "Failed" : "Done"}
        </span>
      </div>
      <div className="border-t border-line px-3 py-2">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">Input</div>
        <pre className="overflow-x-auto font-mono text-[12px] text-muted">{JSON.stringify(args)}</pre>
      </div>
      {result !== undefined && (
        <div className="border-t border-line px-3 py-2">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">Result</div>
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[12px] text-text" data-testid="tool-result">
            {typeof result === "string" ? result : JSON.stringify(result)}
          </pre>
        </div>
      )}
    </div>
  );
};
