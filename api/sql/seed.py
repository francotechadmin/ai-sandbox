# World Bank development indicators database.
# Fetched from the World Bank API on first use and cached in /tmp/worldbank.sqlite.
# Covers ~40 countries, 8 indicators, 2000–2023.

import logging
import sqlite3
from pathlib import Path

import httpx

logger = logging.getLogger("api.sql")

_DB_PATH = Path("/tmp/worldbank.sqlite")
_seeded = False

# ── data to fetch ────────────────────────────────────────────────────────────

COUNTRIES = [
    # G7
    "USA", "GBR", "DEU", "FRA", "JPN", "ITA", "CAN",
    # BRICS+
    "BRA", "RUS", "IND", "CHN", "ZAF",
    # East / Southeast Asia
    "KOR", "SGP", "THA", "IDN", "MYS", "VNM", "PHL",
    # South Asia
    "BGD", "PAK",
    # Middle East
    "SAU", "ARE", "TUR", "IRN",
    # Africa
    "NGA", "ETH", "KEN", "EGY", "GHA",
    # Latin America
    "MEX", "ARG", "COL", "CHL", "PER",
    # Europe
    "SWE", "NOR", "NLD", "ESP", "POL",
    # Oceania
    "AUS", "NZL",
]

INDICATORS: dict[str, dict] = {
    "NY.GDP.PCAP.CD": {"name": "GDP per capita",             "unit": "current US$"},
    "NY.GDP.MKTP.CD": {"name": "GDP (total)",                "unit": "current US$"},
    "SP.POP.TOTL":    {"name": "Population",                 "unit": "people"},
    "SP.DYN.LE00.IN": {"name": "Life expectancy at birth",   "unit": "years"},
    "SH.DYN.MORT":    {"name": "Under-5 mortality rate",     "unit": "per 1,000 live births"},
    "IT.NET.USER.ZS": {"name": "Internet users",             "unit": "% of population"},
    "EG.ELC.ACCS.ZS": {"name": "Access to electricity",     "unit": "% of population"},
    "SE.ADT.LITR.ZS": {"name": "Adult literacy rate",        "unit": "% of adults ages 15+"},
}

_WB_BASE = "https://api.worldbank.org/v2"
_COUNTRY_BATCH = ";".join(COUNTRIES)


# ── schema ───────────────────────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS countries (
    code         TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    region       TEXT NOT NULL,
    income_group TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS indicators (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS measurements (
    country_code   TEXT NOT NULL REFERENCES countries(code),
    indicator_code TEXT NOT NULL REFERENCES indicators(code),
    year           INTEGER NOT NULL,
    value          REAL,
    PRIMARY KEY (country_code, indicator_code, year)
);
"""


# ── fetch helpers ────────────────────────────────────────────────────────────

def _fetch_countries(client: httpx.Client) -> list[dict]:
    rows: list[dict] = []
    page = 1
    while True:
        r = client.get(
            f"{_WB_BASE}/country",
            params={"format": "json", "per_page": 300, "page": page},
            timeout=10,
        )
        r.raise_for_status()
        meta, data = r.json()
        rows.extend(data)
        if page >= meta["pages"]:
            break
        page += 1
    return rows


def _fetch_indicator(client: httpx.Client, code: str) -> list[dict]:
    rows: list[dict] = []
    page = 1
    while True:
        r = client.get(
            f"{_WB_BASE}/country/{_COUNTRY_BATCH}/indicator/{code}",
            params={"format": "json", "per_page": 1000, "date": "2000:2023", "page": page},
            timeout=15,
        )
        r.raise_for_status()
        meta, data = r.json()
        rows.extend(data or [])
        if page >= meta["pages"]:
            break
        page += 1
    return rows


# ── seed ─────────────────────────────────────────────────────────────────────

def seed(path: Path = _DB_PATH) -> None:
    global _seeded
    if _seeded and path.exists():
        return

    logger.info("seeding World Bank database → %s", path)
    conn = sqlite3.connect(path)
    conn.executescript(_SCHEMA)

    country_set = set(COUNTRIES)

    with httpx.Client() as client:
        # countries ────────────────────────────────────────────────────────
        try:
            all_countries = _fetch_countries(client)
        except Exception as exc:
            logger.warning("failed to fetch countries: %s", exc)
            all_countries = []

        for c in all_countries:
            if c.get("id") in country_set:
                conn.execute(
                    "INSERT OR IGNORE INTO countries (code, name, region, income_group) VALUES (?,?,?,?)",
                    (
                        c["id"],
                        c.get("name", c["id"]),
                        (c.get("region") or {}).get("value", "Unknown"),
                        (c.get("incomeLevel") or {}).get("value", "Unknown"),
                    ),
                )

        # indicators (static) ──────────────────────────────────────────────
        for code, meta in INDICATORS.items():
            conn.execute(
                "INSERT OR IGNORE INTO indicators (code, name, unit) VALUES (?,?,?)",
                (code, meta["name"], meta["unit"]),
            )

        # measurements ─────────────────────────────────────────────────────
        for ind_code in INDICATORS:
            try:
                rows = _fetch_indicator(client, ind_code)
            except Exception as exc:
                logger.warning("failed to fetch indicator %s: %s", ind_code, exc)
                continue
            for row in rows:
                iso3 = row.get("countryiso3code", "")
                if iso3 not in country_set:
                    continue
                year_str = row.get("date")
                value = row.get("value")
                if not year_str:
                    continue
                conn.execute(
                    "INSERT OR IGNORE INTO measurements (country_code, indicator_code, year, value) "
                    "VALUES (?,?,?,?)",
                    (iso3, ind_code, int(year_str), value),
                )
            logger.info("loaded indicator %s", ind_code)

    conn.commit()
    conn.close()
    _seeded = True
    logger.info("World Bank database ready")


def get_connection(readonly: bool = True) -> sqlite3.Connection:
    """Return a connection to the database, seeding on first use."""
    seed()
    uri = f"file:{_DB_PATH}?mode=ro" if readonly else str(_DB_PATH)
    return sqlite3.connect(uri, uri=readonly)
