export type QueryResult = {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  row_count: number;
  /** The SQL text that produced this result (from tool args). */
  sql?: string;
};

export type SchemaColumn = {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
};

export type SchemaTable = {
  name: string;
  columns: SchemaColumn[];
};

export type ChartType = "line" | "bar" | "table";
