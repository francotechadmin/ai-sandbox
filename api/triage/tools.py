# Tools for the Trade Break Triage agent. They read the synthetic ops data in
# data/ (see app/triage/README.md for what is real and what is not) and are
# read-only: draft_resolution only records a proposal for a human to approve.
# It never amends, cancels or sends anything.

import json
import re
from functools import cache, lru_cache
from pathlib import Path
from typing import Any

from langchain_core.tools import tool

DATA_DIR = Path(__file__).parent / "data"


@cache
def _load(name: str) -> Any:
    return json.loads((DATA_DIR / name).read_text())


def breaks() -> list[dict[str, Any]]:
    return _load("breaks.json")


def _trades() -> dict[str, dict[str, Any]]:
    return {t["trade_id"]: t for t in _load("trades.json")}


@lru_cache(maxsize=1)
def _sops() -> list[dict[str, str]]:
    """The SOPs in procedures.md: one per '## SOP-nn Title' section."""
    sections = re.split(r"^## ", (DATA_DIR / "procedures.md").read_text(), flags=re.M)[1:]
    sops = []
    for section in sections:
        heading, _, body = section.partition("\n")
        sop_id, _, title = heading.partition(" ")
        sops.append({"id": sop_id, "title": title.strip(), "text": body.strip()})
    return sops


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 2}


@tool
def list_open_breaks() -> str:
    """List every open trade break: id, trade_id, counterparty, product, quantity, price, trade_date,
    break_reason and severity. Use it to read the break you were asked to work."""
    return json.dumps(breaks())


@tool
def get_trade_details(trade_id: str) -> str:
    """Get the internal trade record for a trade_id (e.g. 'T-77101'): booked terms, the counterparty
    confirmation as received, any broker recap and notes. Returns an error if the trade is not in the blotter."""
    trade = _trades().get(trade_id.strip().upper())
    if trade is None:
        return f"Error: no trade '{trade_id}' in the trade blotter (source: trades.json)."
    return json.dumps(trade)


@tool
def get_market_snapshot(product: str, date: str) -> str:
    """Get the settlement price and volume for a product on a date (YYYY-MM-DD). Products: 'WTI Crude',
    'Brent Crude', 'Henry Hub Natural Gas', 'RBOB Gasoline', 'ULSD Heating Oil'. The series is front-month
    only. If there is no snapshot for that date (weekend, holiday), the nearest available dates are returned."""
    rows = [r for r in _load("market_snapshots.json") if r["product"].lower() == product.strip().lower()]
    if not rows:
        known = sorted({r["product"] for r in _load("market_snapshots.json")})
        return f"Error: no market data for product '{product}'. Known products: {', '.join(known)}."
    hit = next((r for r in rows if r["date"] == date.strip()), None)
    if hit:
        return json.dumps(hit)
    before = [r for r in rows if r["date"] < date.strip()]
    after = [r for r in rows if r["date"] > date.strip()]
    return json.dumps(
        {
            "error": f"No snapshot for {rows[0]['product']} on {date}: not a trading day in the dataset.",
            "previous": before[-1] if before else None,
            "next": after[0] if after else None,
        }
    )


@tool
def search_procedures(query: str) -> str:
    """Search the operations procedures (SOPs) by keyword, e.g. 'price tolerance', 'escalation', 'missing
    confirmation'. Returns up to 3 matching SOPs with their ids; cite them as [SOP-nn]."""
    wanted = _words(query)
    # A word in the title counts triple: it says what the SOP is about.
    scored = [(len(wanted & _words(s["text"])) + 3 * len(wanted & _words(s["title"])), s) for s in _sops()]
    hits = [s for score, s in sorted(scored, key=lambda x: -x[0]) if score > 0][:3]
    if not hits:
        return "No procedure matches that query. Available: " + "; ".join(f"{s['id']} {s['title']}" for s in _sops())
    return json.dumps(hits)


@tool
def draft_resolution(break_id: str, summary: str, proposed_action: str) -> str:
    """Draft the resolution for a break so a human can approve, reject or edit it. summary: the cause, with
    citations to the evidence. proposed_action: the exact fix to be taken once approved, plus who must be
    told per the escalation matrix. This only records a draft; it executes nothing."""
    if break_id.strip().upper() not in {b["id"] for b in breaks()}:
        return f"Error: unknown break '{break_id}'."
    return json.dumps(
        {
            "status": "pending_approval",
            "executed": False,
            "break_id": break_id.strip().upper(),
            "summary": summary,
            "proposed_action": proposed_action,
        }
    )
