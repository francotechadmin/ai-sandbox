"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui";
import { DraftResolutionTool } from "./DraftCard";

// `product="WTI Crude", date="2025-09-10"`: the call's arguments, readable
// without opening the row.
function argsLine(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  return Object.entries(args as Record<string, unknown>)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(", ");
}

// A read-only tool call: the kit's collapsible row, with the arguments always
// shown so each call can be followed as it happens.
const ReadToolCall: ToolCallMessagePartComponent = ({ toolName, args, argsText, result, status }) => {
  const line = argsLine(args);
  return (
    <ToolFallback.Root data-testid="tool-call" data-tool={toolName}>
      <ToolFallback.Trigger toolName={toolName} status={status} />
      <p className="ps-6 font-mono text-xs break-words text-muted-foreground">
        {toolName}({line})
      </p>
      <ToolFallback.Content>
        <ToolFallback.Error status={status} />
        <ToolFallback.Args argsText={argsText} />
        <ToolFallback.Result result={result} />
      </ToolFallback.Content>
    </ToolFallback.Root>
  );
};

export const TriageToolCall: ToolCallMessagePartComponent = (props) =>
  props.toolName === "draft_resolution" ? <DraftResolutionTool {...props} /> : <ReadToolCall {...props} />;
