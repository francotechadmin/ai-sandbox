import { cn } from "@/lib/utils";
import type { Severity } from "../lib/types";

const STYLES: Record<Severity, string> = {
  low: "border-line text-muted-foreground",
  medium: "border-amber/40 text-amber",
  high: "border-red/50 text-red",
  critical: "border-red bg-red/15 text-red",
};

export function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", STYLES[severity])}
    >
      {severity}
    </span>
  );
}
