"use client";

import { useEffect, useState } from "react";
import { ChevronRightIcon, KeyRoundIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchemaTable } from "../lib/types";

function TableRow({ table }: { table: SchemaTable }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-line/50 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-panel2/60 transition-colors"
      >
        <ChevronRightIcon
          className={cn("size-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
        />
        <span className="font-mono font-medium text-text/80">{table.name}</span>
        <span className="ml-auto text-muted-foreground">{table.columns.length}</span>
      </button>

      {open && (
        <div className="pb-2">
          {table.columns.map((col) => (
            <div key={col.name} className="flex items-center gap-2 px-8 py-1 text-[11px]">
              {col.primary_key ? (
                <KeyRoundIcon className="size-2.5 shrink-0 text-amber" />
              ) : (
                <span className="size-2.5 shrink-0" />
              )}
              <span className={cn("font-mono", col.primary_key ? "text-amber" : "text-text/70")}>
                {col.name}
              </span>
              <span className="ml-auto font-mono text-muted-foreground">{col.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SchemaPanel() {
  const [tables, setTables] = useState<SchemaTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sql/schema")
      .then((r) => r.json())
      .then((d: { tables: SchemaTable[] }) => setTables(d.tables))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex items-center px-4 py-2.5 border-b border-line">
        <span className="text-xs font-medium text-text/70">Schema</span>
      </div>

      {loading ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">Loading…</div>
      ) : tables.length === 0 ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">No tables found.</div>
      ) : (
        <div>
          {tables.map((t) => (
            <TableRow key={t.name} table={t} />
          ))}
        </div>
      )}
    </div>
  );
}
