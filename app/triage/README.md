# Trade Break Triage

An ops analyst opens a trade break; the agent investigates with tools and drafts
a resolution for human approval. **It drafts only. Nothing is ever executed.**

## What's real vs. simulated

| Piece | Status |
|---|---|
| Agent loop, streaming, live tool calls, prompt-tree UI | Real: the shared assistant stack (`api/assistant/`), with `api/assistant/agents/triage.json` as its config |
| Tools (`api/triage/tools.py`) | Real server functions over the data below: `list_open_breaks`, `get_trade_details`, `get_market_snapshot`, `search_procedures`, `draft_resolution` |
| `draft_resolution` | Records a proposal only. The Approve / Reject / Edit buttons are UI state; no booking system exists to call |
| `breaks.json`, `trades.json`, `procedures.md` | **Synthetic.** Real order flow is proprietary and is never used |
| `market_snapshots.json` | **Placeholder values in this build, not real prices.** Each row says so in its `source` field, so the agent's citations say so too. `scripts/fetch_market_snapshots.py` replaces them with real EIA spot prices (needs a free `EIA_API_KEY`; written against the EIA docs but not yet run) |

EIA data is daily *spot* prices, not CME settlements (CME data is licensed), and
has no volume (`volume` becomes null). The SOPs treat a settlement price as a
sanity check on a trade, never proof of the traded price.

## The 12 scenarios

They are built so the evidence decides the answer, and so that some breaks
*can't* be settled from it (the agent should say what is missing, not guess):

| Break | Case | Evidence settles it? |
|---|---|---|
| 1001 | Transposed digits in booked price | Yes: broker recap + settlement |
| 1002 | Quantity 10x (extra zero) | Yes: broker recap |
| 1003 | Wrong Harbor Point legal entity | No: Legal/Credit must confirm |
| 1004 | Confirmation never received | No: chase per SOP-06 |
| 1005 | Trade date on a Saturday | Yes: no market data that day |
| 1006 | Both prices within 1% of settlement | No: needs broker recap |
| 1007 | Duplicate booking | Yes, subject to front-office check |
| 1008 | Contract month and price differ | No: front-month series only |
| 1009 | USD/MMBtu vs USD/therm | Yes: x10 conversion |
| 1010 | Large notional fat-finger | Yes, but escalate (>USD 10M) |
| 1011 | Confirmation for a trade not in the blotter | No: record missing |
| 1012 | Settlement date mismatch | Not a price issue |

## How it works

- The page pre-loads a break and shows it above the chat. The agent's opening
  prompts contain a `{break_id}` placeholder the UI fills in. The server accepts
  any id there and nothing else (`api/assistant/prompts.py`), so the free-text
  lock holds.
- The conversation walks a prompt tree (investigate, check the price, find the
  SOP, draft, then confidence/gaps), offered as clickable follow-ups.
- Tool calls render as they stream, with their arguments visible on the row.
  `draft_resolution` renders as a card instead of raw JSON.
- The system prompt is the one specified for the demo, plus a short note on
  citation format. It is locked server-side like the other demos'.
