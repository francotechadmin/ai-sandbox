"""Replace api/triage/data/market_snapshots.json with real public prices from the EIA.

    EIA_API_KEY=... python scripts/fetch_market_snapshots.py [YYYY-MM-DD YYYY-MM-DD]

The key is free (https://www.eia.gov/opendata/register.php). These are EIA daily
*spot* prices, not CME settlements (CME data is licensed), and the EIA publishes
no volume, so `volume` is null. The breaks and trades in data/ were written
against the placeholder Sep 2025 dates; if you change the window, re-check that
each break's trade_date still has a snapshot.

NOTE: written against the EIA API v2 docs and not yet run against the live API.
"""

import json
import os
import sys
from pathlib import Path

import httpx

OUT = Path(__file__).resolve().parents[1] / "api/triage/data/market_snapshots.json"
API = "https://api.eia.gov/v2"
# (route, EIA series id) -> (product, unit)
SERIES = {
    ("petroleum/pri/spt", "RWTC"): ("WTI Crude", "USD/bbl"),
    ("petroleum/pri/spt", "RBRTE"): ("Brent Crude", "USD/bbl"),
    ("petroleum/pri/spt", "EER_EPMRU_PF4_RGC_DPG"): ("RBOB Gasoline", "USD/gal"),
    ("petroleum/pri/spt", "EER_EPD2DXL0_PF4_RGC_DPG"): ("ULSD Heating Oil", "USD/gal"),
    ("natural-gas/pri/fut", "RNGWHHD"): ("Henry Hub Natural Gas", "USD/MMBtu"),
}


def fetch(route: str, series: str, start: str, end: str, key: str) -> list[dict]:
    params = {
        "api_key": key,
        "frequency": "daily",
        "data[0]": "value",
        "facets[series][]": series,
        "start": start,
        "end": end,
        "sort[0][column]": "period",
        "sort[0][direction]": "asc",
        "length": 5000,
    }
    response = httpx.get(f"{API}/{route}/data/", params=params, timeout=30)
    response.raise_for_status()
    return response.json()["response"]["data"]


def main() -> None:
    key = os.environ.get("EIA_API_KEY")
    if not key:
        sys.exit("Set EIA_API_KEY (free at https://www.eia.gov/opendata/register.php).")
    start, end = sys.argv[1:3] if len(sys.argv) == 3 else ("2025-09-02", "2025-09-30")
    rows = []
    for (route, series), (product, unit) in SERIES.items():
        for r in fetch(route, series, start, end, key):
            if r["value"] is None:
                continue
            rows.append(
                {
                    "product": product,
                    "date": r["period"],
                    "price": float(r["value"]),
                    "unit": unit,
                    "volume": None,
                    "source": f"EIA spot price {series} (U.S. Energy Information Administration, public)",
                }
            )
    OUT.write_text(json.dumps(rows, indent=1) + "\n")
    print(f"Wrote {len(rows)} snapshots to {OUT}")


if __name__ == "__main__":
    main()
