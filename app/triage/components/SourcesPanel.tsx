"use client";

import { XIcon } from "lucide-react";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";

const SOURCES = [
  { file: "market_snapshots.json", what: "Daily settlement price and volume, 5 products, Sep 2025", origin: "Placeholder values (see below)" },
  { file: "breaks.json", what: "12 break scenarios", origin: "Synthetic" },
  { file: "trades.json", what: "Trade records, confirmations, broker recaps", origin: "Synthetic" },
  { file: "procedures.md", what: "9 SOPs: handling, escalation, matching", origin: "Synthetic" },
];

export function SourcesPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent data-testid="sources">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <ResponsiveDialogTitle className="text-[14px] font-semibold">Data sources</ResponsiveDialogTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">What the agent&apos;s tools read</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-text"
            aria-label="Close data sources"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <ul className="divide-y divide-line/60">
          {SOURCES.map((s) => (
            <li key={s.file} className="px-5 py-2.5">
              <p className="font-mono text-[12px]">{s.file}</p>
              <p className="text-xs text-text/70">{s.what}</p>
              <p className="text-[11px] text-muted-foreground">{s.origin}</p>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-5 py-3 text-xs leading-relaxed text-muted-foreground">
          No real order flow is used. The market prices in this build are illustrative placeholders, labelled as such in
          every tool result; <span className="font-mono">scripts/fetch_market_snapshots.py</span> replaces them with
          public EIA spot prices.
        </p>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
