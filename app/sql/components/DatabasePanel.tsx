"use client";

import { XIcon } from "lucide-react";
import { SchemaPanel } from "./SchemaPanel";

const INDICATORS = [
  { code: "NY.GDP.PCAP.CD", name: "GDP per capita", unit: "current US$" },
  { code: "NY.GDP.MKTP.CD", name: "GDP (total)", unit: "current US$" },
  { code: "SP.POP.TOTL", name: "Population", unit: "people" },
  { code: "SP.DYN.LE00.IN", name: "Life expectancy at birth", unit: "years" },
  { code: "SH.DYN.MORT", name: "Under-5 mortality rate", unit: "per 1,000 live births" },
  { code: "IT.NET.USER.ZS", name: "Internet users", unit: "% of population" },
  { code: "EG.ELC.ACCS.ZS", name: "Access to electricity", unit: "% of population" },
  { code: "SE.ADT.LITR.ZS", name: "Adult literacy rate", unit: "%" },
];

export function DatabasePanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/50" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
        <div
          className="flex w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-line bg-panel"
          style={{ maxHeight: "85dvh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="text-[14px] font-semibold">World Bank Database</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                World Bank Open Data · 42 countries · 2000–2023
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-text"
              aria-label="Close database panel"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          {/* Coverage stats */}
          <div className="grid grid-cols-4 divide-x divide-line border-b border-line">
            {[
              { value: "42", label: "Countries" },
              { value: "8", label: "Indicators" },
              { value: "8,064", label: "Data points" },
              { value: "552 KB", label: "DB size" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center py-3">
                <span className="text-[14px] font-semibold text-text">{value}</span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Indicators */}
          <div className="border-b border-line">
            <p className="px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Indicators
            </p>
            {INDICATORS.map((ind) => (
              <div key={ind.code} className="flex items-baseline justify-between px-5 py-1.5">
                <span className="text-[13px] text-text/80">{ind.name}</span>
                <span className="ml-3 shrink-0 font-mono text-[11px] text-muted-foreground">{ind.unit}</span>
              </div>
            ))}
          </div>

          {/* Schema */}
          <SchemaPanel />
        </div>
      </div>
    </>
  );
}
