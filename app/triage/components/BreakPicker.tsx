"use client";

import { XIcon } from "lucide-react";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";
import type { TradeBreak } from "../lib/types";
import { SeverityChip } from "./SeverityChip";

export function BreakPicker({
  breaks,
  currentId,
  isOpen,
  onSelect,
  onClose,
}: {
  breaks: TradeBreak[];
  currentId: string;
  isOpen: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent data-testid="break-picker">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <ResponsiveDialogTitle className="text-[14px] font-semibold">Open breaks</ResponsiveDialogTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Picking one starts a fresh investigation.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-text"
            aria-label="Close open breaks"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <ul className="max-h-[60dvh] overflow-y-auto py-1">
          {breaks.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                aria-current={b.id === currentId}
                className={cn(
                  "flex w-full flex-col gap-1 px-5 py-2.5 text-left transition-colors hover:bg-white/[0.04]",
                  b.id === currentId && "bg-white/[0.04]",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-semibold">{b.id}</span>
                  <SeverityChip severity={b.severity} />
                  <span className="truncate text-xs text-muted-foreground">
                    {b.product} · {b.counterparty}
                  </span>
                </span>
                <span className="line-clamp-2 text-xs text-text/70">{b.break_reason}</span>
              </button>
            </li>
          ))}
        </ul>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
