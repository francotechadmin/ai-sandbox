export type Severity = "low" | "medium" | "high" | "critical";

export type TradeBreak = {
  id: string;
  trade_id: string;
  counterparty: string;
  product: string;
  quantity: number;
  price: number;
  trade_date: string;
  break_reason: string;
  severity: Severity;
};

// What draft_resolution returns: a proposal only, never an executed action.
export type Draft = {
  status: "pending_approval";
  executed: false;
  break_id: string;
  summary: string;
  proposed_action: string;
};
