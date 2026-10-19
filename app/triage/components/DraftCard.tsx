"use client";

import { useState } from "react";
import { CheckIcon, FileTextIcon, LoaderIcon, PencilIcon, XIcon } from "lucide-react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui";
import { cn } from "@/lib/utils";
import type { Draft } from "../lib/types";

type Decision = "pending" | "editing" | "approved" | "rejected";

function parseDraft(result: unknown): Draft | null {
  if (typeof result !== "string") return null;
  try {
    const d = JSON.parse(result) as Draft;
    return d.status === "pending_approval" ? d : null;
  } catch {
    return null;
  }
}

const action =
  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-40";

// draft_resolution rendered as a card for a human to Approve, Reject or Edit.
// The tool only records a proposal; "approving" here is a UI state, and nothing
// is sent to any booking system (the demo never executes).
export const DraftResolutionTool: ToolCallMessagePartComponent = (props) => {
  const draft = parseDraft(props.result);
  const [decision, setDecision] = useState<Decision>("pending");
  const [edits, setEdits] = useState<{ summary: string; action: string } | null>(null);

  if (props.result === undefined && props.status?.type !== "incomplete") {
    return (
      <div className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground" role="status">
        <LoaderIcon className="size-4 animate-spin [animation-duration:0.6s]" aria-hidden />
        <span className="shimmer motion-reduce:animate-none">Drafting resolution…</span>
      </div>
    );
  }
  if (!draft) return <ToolFallback {...props} />; // an error from the tool

  const summary = edits?.summary ?? draft.summary;
  const proposed = edits?.action ?? draft.proposed_action;
  const editing = decision === "editing";

  return (
    <div
      data-testid="draft-card"
      data-decision={decision}
      className={cn(
        "w-full rounded-xl border bg-panel px-4 py-3.5",
        decision === "approved" && "border-green/50",
        decision === "rejected" && "border-red/40",
        (decision === "pending" || editing) && "border-tool/40",
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <FileTextIcon className="size-3.5" aria-hidden />
        Draft resolution · {draft.break_id}
        {edits && <span className="rounded-full border border-line px-1.5 py-px normal-case tracking-normal">edited</span>}
      </div>

      <div className="mt-2.5 space-y-3 text-[13.5px] leading-relaxed">
        <Field label="Cause and evidence" editing={editing} value={summary} onChange={(v) => setEdits({ summary: v, action: proposed })} />
        <Field label="Proposed action" editing={editing} value={proposed} onChange={(v) => setEdits({ summary, action: v })} />
      </div>

      {decision === "approved" || decision === "rejected" ? (
        <p className="mt-3.5 flex items-center gap-1.5 text-[13px]" role="status">
          {decision === "approved" ? (
            <CheckIcon className="size-4 text-green" aria-hidden />
          ) : (
            <XIcon className="size-4 text-red" aria-hidden />
          )}
          <span className="font-medium">{decision === "approved" ? "Approved" : "Rejected"}</span>
          <span className="text-muted-foreground">
            {decision === "approved" ? "— recorded only; this demo executes nothing." : "— the draft is discarded."}
          </span>
        </p>
      ) : (
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {editing ? (
            <button type="button" onClick={() => setDecision("pending")} className={cn(action, "border-tool/50 text-tool hover:bg-tool/10")}>
              <CheckIcon className="size-3.5" aria-hidden /> Done editing
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setDecision("approved")} className={cn(action, "border-green/50 text-green hover:bg-green/10")}>
                <CheckIcon className="size-3.5" aria-hidden /> Approve
              </button>
              <button type="button" onClick={() => setDecision("rejected")} className={cn(action, "border-red/50 text-red hover:bg-red/10")}>
                <XIcon className="size-3.5" aria-hidden /> Reject
              </button>
              <button type="button" onClick={() => setDecision("editing")} className={cn(action, "border-line text-text/80 hover:bg-white/[0.04]")}>
                <PencilIcon className="size-3.5" aria-hidden /> Edit
              </button>
            </>
          )}
          <span className="text-[11px] text-muted-foreground">Draft only — nothing is executed.</span>
        </div>
      )}
    </div>
  );
};

function Field({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {editing ? (
        <textarea
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="mt-1 w-full resize-y rounded-lg border border-line bg-bg px-2.5 py-2 text-[13px] outline-none focus-visible:border-tool/60"
        />
      ) : (
        <p className="mt-0.5 whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}
