import type { ChartType, QueryResult } from "./types";

type Cell = string | number | boolean | null;

const YEAR_RANGE = { min: 1950, max: 2030 };

function isYearLike(values: Cell[]): boolean {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return false;
  return nums.every((n) => n >= YEAR_RANGE.min && n <= YEAR_RANGE.max && Number.isInteger(n));
}

export function detectChartType(result: QueryResult): ChartType {
  const { columns, rows } = result;
  if (rows.length === 0) return "table";

  const sample = rows[0];
  if (!sample) return "table";

  const yearIdx = columns.findIndex(
    (c, i) =>
      c.toLowerCase() === "year" ||
      (typeof sample[i] === "number" && isYearLike(rows.map((r) => r[i] ?? null))),
  );

  const textCols = columns.filter((_, i) => i !== yearIdx && typeof sample[i] === "string");
  const numCols  = columns.filter((_, i) => i !== yearIdx && typeof sample[i] === "number");

  if (yearIdx >= 0 && numCols.length >= 1) return "line";
  if (textCols.length === 1 && numCols.length === 1 && rows.length <= 30) return "bar";
  return "table";
}

export type ChartRow = Record<string, number | string | null>;

export function pivotLineData(result: QueryResult): { data: ChartRow[]; series: string[] } {
  const { columns, rows } = result;
  if (rows.length === 0) return { data: [], series: [] };

  const first = rows[0]!;
  const yearIdx  = columns.findIndex((c, i) => c.toLowerCase() === "year" || isYearLike(rows.map((r) => r[i] ?? null)));
  const textIdx  = columns.findIndex((_, i) => i !== yearIdx && typeof first[i] === "string");
  const valueIdx = columns.findIndex((_, i) => i !== yearIdx && i !== textIdx && typeof first[i] === "number");

  if (yearIdx < 0 || valueIdx < 0) return { data: [], series: [] };

  const byYear = new Map<number, ChartRow>();
  const seriesSet = new Set<string>();

  for (const row of rows) {
    const year  = Number(row[yearIdx]);
    const value = (row[valueIdx] ?? null) as number | null;
    const label = textIdx >= 0 ? String(row[textIdx]) : (columns[valueIdx] ?? "value");

    if (!byYear.has(year)) byYear.set(year, { year });
    byYear.get(year)![label] = value;
    seriesSet.add(label);
  }

  const data = Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row);

  return { data, series: Array.from(seriesSet) };
}

export function extractBarData(result: QueryResult): ChartRow[] {
  const { columns, rows } = result;
  if (rows.length === 0) return [];
  const first = rows[0]!;
  const textIdx  = columns.findIndex((_, i) => typeof first[i] === "string");
  const valueIdx = columns.findIndex((_, i) => i !== textIdx && typeof first[i] === "number");
  if (textIdx < 0 || valueIdx < 0) return [];
  return rows.map((r) => ({
    name: String(r[textIdx]),
    value: (r[valueIdx] ?? null) as number | null,
  }));
}

export const SERIES_COLORS = [
  "#7db3d8",
  "#4fae76",
  "#e2a545",
  "#d3654f",
  "#9b7fe8",
  "#4fbfae",
  "#d87db3",
  "#a8c77a",
];
