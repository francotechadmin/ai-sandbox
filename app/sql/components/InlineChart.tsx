"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { detectChartType, extractBarData, pivotLineData, SERIES_COLORS } from "../lib/chart";
import type { QueryResult } from "../lib/types";

export type ChartData = QueryResult & { title?: string };

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (Math.abs(v) >= 1e3) return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return v.toFixed(2).replace(/\.?0+$/, "");
  }
  return String(v);
}

const CHART_STYLE = { fontSize: 11, fontFamily: "var(--font-mono)", fill: "#8a909c" };
const TOOLTIP_STYLE = {
  contentStyle: { background: "#0c0e15", border: "1px solid #1c202b", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#ece9e2", fontFamily: "var(--font-mono)" },
  itemStyle: { color: "#8a909c" },
};

function tooltipFmt(value: unknown): [string, string] {
  return [fmt(value), ""];
}

function LineChartView({ result }: { result: QueryResult }) {
  const { data, series } = useMemo(() => pivotLineData(result), [result]);
  if (data.length === 0) return <RawTable result={result} />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c202b" />
        <XAxis dataKey="year" tick={CHART_STYLE} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmt} tick={CHART_STYLE} tickLine={false} axisLine={false} width={56} />
        <Tooltip {...TOOLTIP_STYLE} formatter={tooltipFmt} />
        {series.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#8a909c" }} />
        )}
        {series.map((s, i) => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarChartView({ result }: { result: QueryResult }) {
  const data = useMemo(() => extractBarData(result), [result]);
  if (data.length === 0) return <RawTable result={result} />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#1c202b" horizontal={false} />
        <XAxis type="number" tickFormatter={fmt} tick={CHART_STYLE} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={CHART_STYLE} tickLine={false} axisLine={false} width={110} />
        <Tooltip {...TOOLTIP_STYLE} formatter={tooltipFmt} />
        <Bar dataKey="value" fill={SERIES_COLORS[0]} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RawTable({ result }: { result: QueryResult }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-line">
            {result.columns.map((col) => (
              <th key={col} className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="border-b border-line/50 hover:bg-panel2/60">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 font-mono text-text/80 whitespace-nowrap">
                  {fmt(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InlineChart({ data }: { data: ChartData }) {
  const chartType = useMemo(() => detectChartType(data), [data]);

  return (
    <div className="my-1 w-full overflow-hidden rounded-xl border border-line bg-panel2">
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-xs font-medium text-text/70">
          {data.title || (chartType !== "table" ? "Chart" : "Results")}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {data.row_count} row{data.row_count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="px-2 pb-3">
        {chartType === "line" && <LineChartView result={data} />}
        {chartType === "bar" && <BarChartView result={data} />}
        {chartType === "table" && <RawTable result={data} />}
      </div>
    </div>
  );
}
