# Tools the assistant can call. Which of these are active is a per-request
# setting chosen in the UI; this module only defines what exists.

import ast
import json
import operator
import urllib.parse
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from langchain_core.tools import BaseTool, tool

_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _eval(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        left, right = _eval(node.left), _eval(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > 100:
            raise ValueError("Exponent too large.")
        return _OPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval(node.operand))
    raise ValueError("Only numbers and + - * / ** % ( ) are allowed.")


@tool
def calculator(expression: str) -> str:
    """Evaluate an arithmetic expression, e.g. '(12 + 8) * 3 / 4'."""
    try:
        result = _eval(ast.parse(expression, mode="eval"))
    except ZeroDivisionError:
        return "Error: division by zero."
    except (ValueError, SyntaxError) as err:
        return f"Error: {err}"
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
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "fog", 48: "freezing fog",
    51: "light drizzle", 53: "drizzle", 55: "heavy drizzle",
    56: "freezing drizzle", 57: "heavy freezing drizzle",
    61: "light rain", 63: "rain", 65: "heavy rain",
    66: "freezing rain", 67: "heavy freezing rain",
    71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains",
    80: "light rain showers", 81: "rain showers", 82: "violent rain showers",
    85: "light snow showers", 86: "heavy snow showers",
    95: "thunderstorm", 96: "thunderstorm with hail", 99: "severe thunderstorm with hail",
}


def _get_json(url: str, params: dict) -> dict:
    full = f"{url}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(full, timeout=10) as resp:  # noqa: S310 — fixed https hosts
        return json.load(resp)


def _find_place(location: str) -> dict | None:
    # The geocoder matches on the place name only, so "Houston, TX" is searched
    # as "Houston" and the rest ("TX", "Texas", "US") is used to pick a result.
    name, _, hint = (part.strip() for part in location.partition(","))
    results = _get_json(_GEOCODE_URL, {"name": name, "count": 10, "language": "en"}).get("results") or []
    if hint:
        h = hint.lower()
        for r in results:
            if h in {str(r.get(k, "")).lower() for k in ("admin1", "country", "country_code")}:
                return r
    return results[0] if results else None


@tool
def get_weather(location: str, units: str = "fahrenheit") -> str:
    """Get current weather and today's high/low for a place, e.g. 'Houston, TX' or 'Paris, France'.
    units is 'fahrenheit' (default) or 'celsius'."""
    unit = units.lower()
    if unit not in ("fahrenheit", "celsius"):
        return "Error: units must be 'fahrenheit' or 'celsius'."
    try:
        place = _find_place(location)
        if place is None:
            return f"Error: could not find a place called '{location}'."
        data = _get_json(
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
    except Exception as err:  # noqa: BLE001 — returned to the model so it can tell the user
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


TOOLS: dict[str, BaseTool] = {t.name: t for t in (get_current_time, calculator, get_weather)}


def describe_tools() -> list[dict[str, str]]:
    return [{"name": t.name, "description": (t.description or "").strip()} for t in TOOLS.values()]


def select_tools(names: list[str] | None) -> list[BaseTool]:
    return [TOOLS[n] for n in (names or []) if n in TOOLS]
