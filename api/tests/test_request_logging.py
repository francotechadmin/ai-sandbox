import io
import json
import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.index import app
from api.request_logging import JsonFormatter, RequestLoggingMiddleware

client = TestClient(app)


@pytest.fixture
def records(caplog):
    # configure_logging turns propagation off (stdout only); caplog needs it on.
    logging.getLogger("api").propagate = True
    caplog.set_level(logging.INFO, logger="api")
    yield caplog
    logging.getLogger("api").propagate = False


def request_records(records):
    return [r for r in records.records if r.name == "api.request"]


def test_request_is_logged_with_id(records):
    res = client.get("/api/assistant/config", headers={"x-request-id": "abc-123", "user-agent": "pytest"})
    assert res.headers["x-request-id"] == "abc-123"
    (rec,) = request_records(records)
    assert (rec.method, rec.path, rec.status, rec.user_agent) == ("GET", "/api/assistant/config", 200, "pytest")
    assert rec.duration_ms >= 0


def test_request_id_generated_and_unsafe_ids_replaced(records):
    assert client.get("/api/assistant/config").headers["x-request-id"]
    res = client.get("/api/assistant/config", headers={"x-request-id": "bad id\twith spaces"})
    assert res.headers["x-request-id"] != "bad id\twith spaces"


def test_client_errors_are_warnings_and_bodies_not_logged(records):
    secret = "my secret prompt"
    res = client.post("/api/assistant/chat", json={"commands": [{"type": "nope", "text": secret}]})
    assert res.status_code == 400
    (rec,) = request_records(records)
    assert rec.levelno == logging.WARNING and rec.status == 400
    assert secret not in json.dumps([r.__dict__ for r in records.records], default=str)


def test_unhandled_error_is_logged_and_still_500(records):
    boom = FastAPI()
    boom.add_middleware(RequestLoggingMiddleware)

    @boom.get("/boom")
    def _boom():
        raise RuntimeError("kaboom")

    res = TestClient(boom, raise_server_exceptions=False).get("/boom")
    assert res.status_code == 500
    assert any(r.levelno == logging.ERROR and r.exc_info for r in request_records(records))


def test_json_output_includes_request_id():
    buf = io.StringIO()
    handler = logging.StreamHandler(buf)
    handler.setFormatter(JsonFormatter())
    log = logging.getLogger("api")
    log.addHandler(handler)
    try:
        client.get("/api/assistant/config", headers={"x-request-id": "rid-1"})
    finally:
        log.removeHandler(handler)
    line = json.loads(buf.getvalue().strip().splitlines()[-1])
    assert line["request_id"] == "rid-1" and line["status"] == 200 and line["msg"] == "request"
