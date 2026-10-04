# Tools the assistant can call. Which of these are active is a per-request
# setting chosen in the UI; this module only defines what exists.

import asyncio
import os
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
import simpleeval
from langchain_core.tools import BaseTool, tool
from simpleeval import InvalidExpression, simple_eval

# simpleeval's default exponent cap (4,000,000) still allows multi-second
# integer powers; keep it small enough that a calculation can't tie up the server.
simpleeval.MAX_POWER = 1_000


@tool
def calculator(expression: str) -> str:
    """Evaluate an arithmetic expression, e.g. '(12 + 8) * 3 / 4'."""
    try:
        result = simple_eval(expression)
    except (InvalidExpression, SyntaxError, ArithmeticError) as err:
        return f"Error: {err}"
    if isinstance(result, bool) or not isinstance(result, int | float):
        return "Error: the expression must evaluate to a number."
    return str(int(result)) if float(result).is_integer() else str(result)


@tool
def get_current_time(timezone: str = "UTC") -> str:
    """Get the current date and time in an IANA timezone, e.g. 'America/Chicago'."""
    try:
        now = datetime.now(ZoneInfo(timezone))
    except (ZoneInfoNotFoundError, ValueError):
        return f"Error: unknown timezone '{timezone}'."
    return now.strftime("%A, %Y-%m-%d %H:%M:%S %Z (UTC%z)")


# -- weather (Open-Meteo: free, no API key) -----------------------------------
_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# WMO weather interpretation codes -> text.
_WMO = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "freezing fog",
    51: "light drizzle",
    53: "drizzle",
    55: "heavy drizzle",
    56: "freezing drizzle",
    57: "heavy freezing drizzle",
    61: "light rain",
    63: "rain",
    65: "heavy rain",
    66: "freezing rain",
    67: "heavy freezing rain",
    71: "light snow",
    73: "snow",
    75: "heavy snow",
    77: "snow grains",
    80: "light rain showers",
    81: "rain showers",
    82: "violent rain showers",
    85: "light snow showers",
    86: "heavy snow showers",
    95: "thunderstorm",
    96: "thunderstorm with hail",
    99: "severe thunderstorm with hail",
}


async def _get_json(url: str, params: dict) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()


async def _find_place(location: str) -> dict | None:
    # The geocoder matches on the place name only, so "Houston, TX" is searched
    # as "Houston" and the rest ("TX", "Texas", "US") is used to pick a result.
    name, _, hint = (part.strip() for part in location.partition(","))
    results = (await _get_json(_GEOCODE_URL, {"name": name, "count": 10, "language": "en"})).get("results") or []
    if hint:
        h = hint.lower()
        for r in results:
            if h in {str(r.get(k, "")).lower() for k in ("admin1", "country", "country_code")}:
                return r
    return results[0] if results else None


@tool
async def get_weather(location: str, units: str = "fahrenheit") -> str:
    """Get current weather and today's high/low for a place, e.g. 'Houston, TX' or 'Paris, France'.
    units is 'fahrenheit' (default) or 'celsius'."""
    unit = units.lower()
    if unit not in ("fahrenheit", "celsius"):
        return "Error: units must be 'fahrenheit' or 'celsius'."
    try:
        place = await _find_place(location)
        if place is None:
            return f"Error: could not find a place called '{location}'."
        data = await _get_json(
            _FORECAST_URL,
            {
                "latitude": place["latitude"],
                "longitude": place["longitude"],
                "current": "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "temperature_unit": unit,
                "wind_speed_unit": "mph" if unit == "fahrenheit" else "kmh",
                "timezone": "auto",
                "forecast_days": 1,
            },
        )
    except Exception as err:  # returned to the model so it can tell the user
        return f"Error: weather lookup failed ({err})."
    cur, day = data["current"], data["daily"]
    deg = "°F" if unit == "fahrenheit" else "°C"
    speed = "mph" if unit == "fahrenheit" else "km/h"
    where = ", ".join(str(x) for x in (place.get("name"), place.get("admin1"), place.get("country")) if x)
    return (
        f"{where}: {_WMO.get(cur['weather_code'], 'unknown conditions')}, {cur['temperature_2m']}{deg} "
        f"(feels like {cur['apparent_temperature']}{deg}), humidity {cur['relative_humidity_2m']}%, "
        f"wind {cur['wind_speed_10m']} {speed}. "
        f"Today: high {day['temperature_2m_max'][0]}{deg}, low {day['temperature_2m_min'][0]}{deg}, "
        f"precipitation chance {day['precipitation_probability_max'][0]}%."
    )


# -- equipment data (AI4I 2020, loaded by scripts/load_equipment_data.py) ------
_EQUIPMENT_DB = Path(__file__).parent / "data" / "equipment.db"
_MAX_RESULT_CHARS = 4000
_FORBIDDEN_SQL = re.compile(
    r"\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma|vacuum|reindex|truncate)\b", re.I
)


def check_select_only(sql: str) -> str | None:
    """An error message if `sql` is not a single read-only SELECT, else None."""
    statement = sql.strip().rstrip(";").strip()
    if not statement:
        return "Error: the query is empty."
    if ";" in statement:
        return "Error: only one statement is allowed."
    if not re.match(r"(select|with)\b", statement, re.I) or _FORBIDDEN_SQL.search(statement):
        return "Error: only read-only SELECT queries are allowed."
    return None


def _equipment_db():
    from langchain_community.utilities import SQLDatabase

    path = Path(os.environ.get("EQUIPMENT_DB_PATH") or _EQUIPMENT_DB)
    if not path.is_file():
        return None
    # mode=ro: SQLite itself refuses writes, whatever the query says.
    return SQLDatabase.from_uri(f"sqlite:///file:{path}?mode=ro&uri=true", sample_rows_in_table_info=0)


def _run_equipment_query(sql: str) -> str:
    if (problem := check_select_only(sql)) is not None:
        return problem
    db = _equipment_db()
    if db is None:
        return "Error: the equipment database is not available."
    try:
        result = db.run(sql, fetch="all")
    except Exception as err:  # bad SQL goes back to the model so it can fix the query
        return f"Error: {err}"
    result = str(result) or "No rows."
    if len(result) > _MAX_RESULT_CHARS:
        result = result[:_MAX_RESULT_CHARS] + "\n... (truncated; add a LIMIT or aggregate)"
    return result


@tool
async def query_equipment_data(sql: str) -> str:
    """Run a read-only SQLite SELECT against the machine sensor and failure data (10,000 rows).
    Table `machines` columns: udi (id), product_id, type (quality variant L/M/H), air_temp_k, process_temp_k,
    rotational_speed_rpm, torque_nm, tool_wear_min, machine_failure (1 = failed), and one 0/1 flag per failure
    mode: twf (tool wear), hdf (heat dissipation), pwf (power), osf (overstrain), rnf (random).
    Example: SELECT type, COUNT(*) FROM machines WHERE hdf = 1 GROUP BY type. Returns rows as tuples."""
    return await asyncio.to_thread(_run_equipment_query, sql)


# -- maintenance documents (Upstash Vector) ------------------------------------
# Each indexed chunk is stored as data=<chunk text> with metadata
# {"source": <document name>, "title": <section or runbook title>, "url": <optional>}.
_DOCS_TOP_K = 4


def _docs_index():
    from upstash_vector import Index

    return Index.from_env()  # UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN


def _search_docs(query: str) -> str:
    if not (os.environ.get("UPSTASH_VECTOR_REST_URL") and os.environ.get("UPSTASH_VECTOR_REST_TOKEN")):
        return "Error: the document index is not configured."
    hits = _docs_index().query(data=query, top_k=_DOCS_TOP_K, include_metadata=True, include_data=True)
    if not hits:
        return "No matching documents."
    blocks = []
    for n, hit in enumerate(hits, 1):
        meta = hit.metadata or {}
        cite = ", ".join(str(meta[k]) for k in ("source", "title") if meta.get(k)) or str(hit.id)
        blocks.append(f"[{n}] ({cite}; relevance {hit.score:.2f})\n{(hit.data or '').strip()}")
    return "\n\n".join(blocks)


@tool
async def search_maintenance_docs(query: str) -> str:
    """Search maintenance runbooks and safety/maintenance standards (OSHA, NIST) by meaning.
    Returns the best-matching passages, ranked, each labelled [n] with its source for citation."""
    try:
        return await asyncio.to_thread(_search_docs, query)
    except Exception as err:  # returned to the model so it can tell the user
        return f"Error: document search failed ({err})."


TOOLS: dict[str, BaseTool] = {
    t.name: t for t in (get_current_time, calculator, get_weather, query_equipment_data, search_maintenance_docs)
}


def describe_tools(allowed: list[str] | None = None) -> list[dict[str, str]]:
    return [
        {"name": t.name, "description": (t.description or "").strip()}
        for t in TOOLS.values()
        if allowed is None or t.name in allowed
    ]


def select_tools(names: list[str] | None, allowed: list[str] | None = None) -> list[BaseTool]:
    """The requested tools that exist and, when `allowed` is given, that the agent may use."""
    return [TOOLS[n] for n in (names or []) if n in TOOLS and (allowed is None or n in allowed)]
