# Structured API logging: one JSON line per request on stdout, which is where
# Vercel (and uvicorn locally) collects logs.
#
# Each line carries a request id (the caller's `x-request-id`, else Vercel's
# `x-vercel-id`, else a fresh one) that is also returned in the response
# header and attached to every log line emitted while the request runs, so a
# user-reported id finds the whole story. Request and response bodies are
# never logged — chat prompts and history are user content and the state can
# be large. Log what the app decides (model, tools, counts), not what the user
# typed.
#
# This is a plain ASGI middleware rather than Starlette's BaseHTTPMiddleware:
# the chat endpoint streams, and BaseHTTPMiddleware buffers and mishandles
# client disconnects.

import contextvars
import json
import logging
import os
import re
import sys
import time
import uuid
from typing import Any

from starlette.types import ASGIApp, Message, Receive, Scope, Send

request_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)

logger = logging.getLogger("api.request")

# Attributes every LogRecord has; anything else was passed via `extra=`.
_STANDARD = set(logging.makeLogRecord({}).__dict__) | {"message", "asctime"}
_SAFE_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)) + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if request_id := request_id_var.get():
            entry["request_id"] = request_id
        entry.update({k: v for k, v in record.__dict__.items() if k not in _STANDARD})
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def configure_logging() -> None:
    """Route the `api` loggers through JsonFormatter. Idempotent; level from LOG_LEVEL."""
    root = logging.getLogger("api")
    root.setLevel(os.environ.get("LOG_LEVEL", "INFO").upper())
    if not any(isinstance(h.formatter, JsonFormatter) for h in root.handlers):
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        root.addHandler(handler)
    root.propagate = False


def _header(scope: Scope, name: bytes) -> str | None:
    for key, value in scope["headers"]:
        if key == name:
            return value.decode("latin-1")
    return None


def _client_ip(scope: Scope) -> str | None:
    forwarded = _header(scope, b"x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    client = scope.get("client")
    return client[0] if client else None


class RequestLoggingMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = _header(scope, b"x-request-id") or _header(scope, b"x-vercel-id")
        request_id = incoming if incoming and _SAFE_ID.match(incoming) else uuid.uuid4().hex
        token = request_id_var.set(request_id)
        start = time.perf_counter()
        status = 500

        async def send_with_id(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                message["headers"] = [*message.get("headers", []), (b"x-request-id", request_id.encode())]
            await send(message)

        failed = False
        try:
            await self.app(scope, receive, send_with_id)
        except Exception:
            failed = True
            logger.exception("unhandled error", extra=self._fields(scope, status, start))
            raise
        finally:
            # Also reached on cancellation (client went away mid-stream), where
            # `status` is whatever was already sent.
            if not failed:
                level = logging.ERROR if status >= 500 else logging.WARNING if status >= 400 else logging.INFO
                logger.log(level, "request", extra=self._fields(scope, status, start))
            request_id_var.reset(token)

    @staticmethod
    def _fields(scope: Scope, status: int, start: float) -> dict[str, Any]:
        return {
            "method": scope["method"],
            "path": scope["path"],
            "status": status,
            "duration_ms": round((time.perf_counter() - start) * 1000, 1),
            "client_ip": _client_ip(scope),
            "user_agent": _header(scope, b"user-agent"),
        }
