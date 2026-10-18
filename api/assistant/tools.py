# Tools the assistant can call. Which of these are active is a per-request
# setting chosen in the UI; this module only defines what exists.

import json as _json
import re as _re
import sqlite3 as _sqlite3
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
import simpleeval
from langchain_core.tools import BaseTool, tool
from simpleeval import InvalidExpression, simple_eval

from ..sql.seed import get_connection as _wb_conn

# simpleeval's default exponent cap (4,000,000) still allows multi-second
# integer powers; keep it small enough that a calculation can't tie up the server.
simpleeval.MAX_POWER = 1_000


@tool
def calculator(expression: str) -> str:
    """Evaluate an arithmetic expression, e.g. '(12 + 8) * 3 / 4'."""
    # ^ is bitwise XOR in Python; models often use it for exponentiation.
    expression = expression.replace("^", "**")
    try:
        result = simple_eval(expression)
    except (InvalidExpression, SyntaxError, ArithmeticError, TypeError) as err:
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



@tool
def list_crm_tables() -> str:
    """List all tables in the World Bank database."""
    conn = _wb_conn()
    names = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()]
    conn.close()
    return "Tables: " + ", ".join(names)


@tool
def get_table_schema(table_name: str) -> str:
    """Get the columns and types for a table in the World Bank database."""
    conn = _wb_conn()
    try:
        rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        if not rows:
            return f"Error: table '{table_name}' not found. Use list_crm_tables to see available tables."
        lines = []
        for row in rows:
            flags = []
            if row[5]:
                flags.append("PRIMARY KEY")
            if row[3]:
                flags.append("NOT NULL")
            lines.append(f"  {row[1]} {row[2]}" + (f" ({', '.join(flags)})" if flags else ""))
        return f"Table: {table_name}\n" + "\n".join(lines)
    except Exception as exc:
        return f"Error: {exc}"
    finally:
        conn.close()


def _safe_select(sql: str, limit: int = 500) -> str:
    first = sql.strip().split()[0].upper() if sql.strip() else ""
    if first not in ("SELECT", "WITH"):
        return "Error: only SELECT and WITH queries are allowed."
    if _re.search(r'\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|REPLACE|ATTACH|DETACH)\b', sql, _re.IGNORECASE):
        return "Error: only SELECT and WITH queries are allowed."
    conn = _wb_conn()
    try:
        cur = conn.execute(sql)
        columns = [d[0] for d in (cur.description or [])]
        rows = [list(r) for r in cur.fetchmany(limit)]
        return _json.dumps({"columns": columns, "rows": rows, "row_count": len(rows)})
    except _sqlite3.Error as exc:
        return f"Error: {exc}"
    finally:
        conn.close()


@tool
def run_sql_query(sql: str) -> str:
    """Run a read-only SELECT query on the World Bank database. Returns JSON with columns and rows (max 500 rows).
    Only SELECT and WITH (CTE) queries are allowed. Use this to look up values, counts, or detailed data.
    Use create_chart instead when the result should be visualized as a chart in the chat."""
    return _safe_select(sql)


@tool
def create_chart(sql: str, title: str = "") -> str:
    """Run a SQL query and render the result as an interactive chart directly in the chat.
    Use this when a visual chart adds real insight — time series comparisons, rankings, distributions.
    Do NOT use this for every query; only when a chart is genuinely more useful than a table.
    The chart type (line vs bar) is detected automatically from the result shape.
    Returns a JSON payload the UI renders as a chart."""
    result = _safe_select(sql, limit=300)
    if result.startswith("Error:"):
        return result
    try:
        data = _json.loads(result)
        data["title"] = title
        data["sql"] = sql
        return _json.dumps(data)
    except Exception as exc:
        return f"Error: {exc}"


TOOLS: dict[str, BaseTool] = {
    t.name: t
    for t in (get_current_time, calculator, get_weather, list_crm_tables, get_table_schema, run_sql_query, create_chart)
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
