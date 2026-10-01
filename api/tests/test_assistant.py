import json

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from api.assistant import registry
from api.assistant.history import state_to_messages
from api.index import app


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("ASSISTANT_FAKE_MODEL", "1")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)


client = TestClient(app)


def apply_ops(state, ops):
    for op in ops:
        target = state
        *parents, last = op["path"]
        for key in parents:
            target = target[int(key)] if isinstance(target, list) else target[key]
        key = int(last) if isinstance(target, list) else last
        if op["type"] == "set":
            if isinstance(target, list) and key == len(target):
                target.append(op["value"])
            else:
                target[key] = op["value"]
        elif op["type"] == "append-text":
            target[key] += op["value"]
        else:
            raise AssertionError(op)
    return state


def run_chat(text, *, state=None, **settings):
    body = {
        "state": state or {"messages": []},
        "commands": [
            {
                "type": "add-message",
                "message": {"role": "user", "parts": [{"type": "text", "text": text}]},
                "parentId": None,
                "sourceId": None,
            }
        ],
        "settings": {"model": "demo-fake", **settings},
    }
    resp = client.post("/api/assistant/chat", json=body)
    assert resp.status_code == 200, resp.text
    final = json.loads(json.dumps(body["state"]))
    for line in resp.text.splitlines():
        if line.startswith("aui-state:"):
            apply_ops(final, json.loads(line[len("aui-state:") :]))
    return final


# -- registry / reasoning toggle ---------------------------------------------
def spec(provider):
    return next(m for m in registry.list_models() if m.provider == provider)


def test_anthropic_reasoning_on_enables_thinking_and_leaves_temperature_alone():
    params = registry.model_params(spec("anthropic"), reasoning=True)
    assert params["thinking"] == {"type": "enabled", "budget_tokens": 4000}
    assert params["max_tokens"] > params["thinking"]["budget_tokens"]
    assert "temperature" not in params


def test_anthropic_reasoning_off_has_no_thinking():
    assert "thinking" not in registry.model_params(spec("anthropic"), reasoning=False)


def test_openai_reasoning_toggle_uses_responses_api_and_summaries():
    on = registry.model_params(spec("openai"), reasoning=True)
    off = registry.model_params(spec("openai"), reasoning=False)
    assert on["use_responses_api"] and on["reasoning"] == {"effort": "medium", "summary": "auto"}
    assert off["reasoning"] == {"effort": "minimal"}


def test_reasoning_ignored_when_model_does_not_support_it():
    unsupported = registry.ModelSpec("m", "M", "anthropic", "x", reasoning={"supported": False})
    assert "thinking" not in registry.model_params(unsupported, reasoning=True)


def test_real_models_construct_with_params(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    monkeypatch.setenv("OPENAI_API_KEY", "test")
    for provider in ("anthropic", "openai"):
        for reasoning in (True, False):
            assert registry.build_model(spec(provider), reasoning) is not None


# -- config endpoint ---------------------------------------------------------
def test_config_lists_models_tools_and_default_prompt():
    data = client.get("/api/assistant/config").json()
    by_id = {m["id"]: m for m in data["models"]}
    assert by_id["claude-haiku-4-5"]["available"] is False  # no key in test env
    assert by_id["demo-fake"]["available"] is True
    assert {t["name"] for t in data["tools"]} == {"calculator", "get_current_time", "get_weather"}
    assert data["defaultSystemPrompt"]


# -- chat endpoint -----------------------------------------------------------
def test_system_prompt_comes_from_the_request_and_nothing_is_injected():
    with_prompt = run_chat("hi", systemPrompt="Be terse.")
    assert "[system: Be terse.]" in with_prompt["messages"][-1]["parts"][-1]["text"]
    without = run_chat("hi", systemPrompt="   ")
    assert "[system: none]" in without["messages"][-1]["parts"][-1]["text"]


def test_reasoning_toggle_controls_reasoning_parts():
    on = run_chat("hi", reasoning=True)["messages"][-1]["parts"]
    off = run_chat("hi", reasoning=False)["messages"][-1]["parts"]
    assert [p["type"] for p in on] == ["reasoning", "text"]
    assert [p["type"] for p in off] == ["text"]


def test_tool_call_is_streamed_and_resolved():
    state = run_chat("please calc 12*(3+4)", reasoning=True, tools=["calculator"])
    user, assistant = state["messages"]
    assert user["role"] == "user" and assistant["status"] == "complete"
    types = [p["type"] for p in assistant["parts"]]
    assert types == ["reasoning", "tool-call", "reasoning", "text"]
    call = assistant["parts"][1]
    assert call["toolName"] == "calculator"
    assert call["args"] == {"expression": "12*(3+4)"}
    assert call["result"] == "84" and call["status"] == "complete"
    assert "84" in assistant["parts"][-1]["text"]
    # steps are one-per-model-call, not inflated by trailing chunks
    assert [p["step"] for p in assistant["parts"]] == [0, 0, 1, 1]


def test_tools_are_only_available_when_enabled():
    state = run_chat("please calc 1+1", tools=[])
    assert [p["type"] for p in state["messages"][-1]["parts"]] == ["text"]


def test_second_turn_continues_the_conversation():
    first = run_chat("please calc 2*3", tools=["calculator"])
    second = run_chat("and thanks", state=first, tools=["calculator"])
    roles = [m["role"] for m in second["messages"]]
    assert roles == ["user", "assistant", "user", "assistant"]
    assert second["messages"][-1]["status"] == "complete"


def test_model_failure_is_reported_on_the_message_not_swallowed():
    state = run_chat("boom")
    assistant = state["messages"][-1]
    assert assistant["status"] == "error"
    assert "scripted failure" in assistant["error"]


@pytest.mark.parametrize(
    "settings,text,fragment",
    [
        ({"model": "nope"}, "hi", "Unknown model"),
        ({"model": "claude-haiku-4-5"}, "hi", "ANTHROPIC_API_KEY"),
        ({"model": "demo-fake"}, "   ", "No user message"),
    ],
)
def test_bad_requests_get_clear_400s(settings, text, fragment):
    body = {
        "state": {"messages": []},
        "commands": [
            {"type": "add-message", "message": {"role": "user", "parts": [{"type": "text", "text": text}]}}
        ],
        "settings": settings,
    }
    resp = client.post("/api/assistant/chat", json=body)
    assert resp.status_code == 400 and fragment in resp.json()["detail"]


# -- history -----------------------------------------------------------------
def test_state_to_messages_replays_tool_loops_and_drops_reasoning():
    state = {
        "messages": [
            {"id": "1", "role": "user", "text": "calc"},
            {
                "id": "2",
                "role": "assistant",
                "status": "complete",
                "parts": [
                    {"type": "reasoning", "step": 0, "text": "hmm"},
                    {"type": "tool-call", "step": 0, "toolCallId": "c1", "toolName": "calculator",
                     "args": {"expression": "1+1"}, "status": "complete", "result": "2"},
                    {"type": "text", "step": 1, "text": "It is 2."},
                ],
            },
        ]
    }
    msgs = state_to_messages(state)
    assert [type(m) for m in msgs] == [HumanMessage, AIMessage, ToolMessage, AIMessage]
    assert msgs[1].tool_calls[0]["id"] == "c1" and msgs[2].tool_call_id == "c1"
    assert msgs[3].content == "It is 2."
    assert "hmm" not in json.dumps([m.model_dump() for m in msgs])


def test_interrupted_tool_call_still_gets_a_tool_message():
    state = {"messages": [{"id": "2", "role": "assistant", "parts": [
        {"type": "tool-call", "step": 0, "toolCallId": "c1", "toolName": "calculator", "args": {}, "result": None}
    ]}]}
    msgs = state_to_messages(state)
    assert isinstance(msgs[-1], ToolMessage) and "did not complete" in msgs[-1].content


# -- tools -------------------------------------------------------------------
def test_calculator_is_safe_and_correct():
    from api.assistant.tools import calculator

    assert calculator.invoke({"expression": "(12 + 8) * 3 / 4"}) == "15"
    assert calculator.invoke({"expression": "1/0"}).startswith("Error")
    assert calculator.invoke({"expression": "__import__('os').system('echo hi')"}).startswith("Error")
    assert calculator.invoke({"expression": "9**9**9"}).startswith("Error")


def test_weather_formats_forecast_and_picks_place_by_hint(monkeypatch):
    from api.assistant import tools

    seen = []

    def fake_get_json(url, params):
        seen.append((url, params))
        if url == tools._GEOCODE_URL:
            return {"results": [
                {"name": "Houston", "admin1": "Mississippi", "country": "United States", "latitude": 1.0, "longitude": 1.0},
                {"name": "Houston", "admin1": "Texas", "country": "United States", "latitude": 29.76, "longitude": -95.37},
            ]}
        return {
            "current": {"temperature_2m": 88.1, "apparent_temperature": 95.0, "relative_humidity_2m": 70,
                        "wind_speed_10m": 9.3, "weather_code": 2},
            "daily": {"temperature_2m_max": [91.0], "temperature_2m_min": [76.5], "precipitation_probability_max": [20]},
        }

    monkeypatch.setattr(tools, "_get_json", fake_get_json)
    out = tools.get_weather.invoke({"location": "Houston, Texas"})
    assert out.startswith("Houston, Texas, United States: partly cloudy, 88.1°F")
    assert "high 91.0°F, low 76.5°F" in out and "mph" in out
    assert seen[0][1]["name"] == "Houston"  # hint is not sent to the geocoder
    assert seen[1][1]["latitude"] == 29.76  # and it picked the Texas result


def test_weather_errors_are_returned_not_raised(monkeypatch):
    from api.assistant import tools

    monkeypatch.setattr(tools, "_get_json", lambda url, params: {})
    assert tools.get_weather.invoke({"location": "Nowhereville"}).startswith("Error: could not find")
    assert tools.get_weather.invoke({"location": "x", "units": "kelvin"}).startswith("Error: units")

    def boom(url, params):
        raise OSError("offline")

    monkeypatch.setattr(tools, "_get_json", boom)
    assert "weather lookup failed" in tools.get_weather.invoke({"location": "Paris"})
