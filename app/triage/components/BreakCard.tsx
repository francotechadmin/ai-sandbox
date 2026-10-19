"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeBreak } from "../lib/types";
import { SeverityChip } from "./SeverityChip";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });

// The break the analyst has open: always visible above the chat.
export function BreakCard({ brk }: { brk: TradeBreak }) {
  // On a phone the trade fields fold away so the chat keeps its room.
  const [open, setOpen] = useState(false);
  const fields: [string, string][] = [
    ["Trade", brk.trade_id],
    ["Counterparty", brk.counterparty],
    ["Product", brk.product],
    ["Quantity", fmt(brk.quantity)],
    ["Price", fmt(brk.price)],
    ["Trade date", brk.trade_date],
  ];
  return (
    <section
      data-testid="break-card"
      aria-label={`Open break ${brk.id}`}
      className="mx-auto w-full max-w-[44rem] px-4 pt-4"
    >
      <div className="rounded-xl border border-line bg-panel/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-semibold">{brk.id}</span>
          <SeverityChip severity={brk.severity} />
          <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground">Open break</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-snug text-text/85">{brk.break_reason}</p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground sm:hidden"
        >
          Trade details
          <ChevronDownIcon className={cn("size-3 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <dl className={cn("mt-2.5 grid-cols-2 gap-x-4 gap-y-1.5 sm:grid sm:grid-cols-3", open ? "grid" : "hidden")}>
          {fields.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
              <dd className="truncate font-mono text-[12px]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
