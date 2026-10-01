# Tools the assistant can call. Which of these are active is a per-request
# setting chosen in the UI; this module only defines what exists.

import ast
import operator
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


TOOLS: dict[str, BaseTool] = {t.name: t for t in (get_current_time, calculator)}


def describe_tools() -> list[dict[str, str]]:
    return [{"name": t.name, "description": (t.description or "").strip()} for t in TOOLS.values()]


def select_tools(names: list[str] | None) -> list[BaseTool]:
    return [TOOLS[n] for n in (names or []) if n in TOOLS]
