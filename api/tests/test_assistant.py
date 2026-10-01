import json

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from api.assistant import registry, router
from api.assistant.history import state_to_messages
from api.index import app


@pytest.fixture(autouse=True)
def _env(monkeypatch):
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


# -- registry ----------------------------------------------------------------
def spec(provider):
    return next(m for m in registry.list_models() if m.provider == provider)


def params(model_spec):
    return registry.PROVIDERS[model_spec.provider].params(model_spec)


def test_anthropic_budget_style_enables_thinking_and_leaves_temperature_alone():
    result = params(spec("anthropic"))
    assert result["thinking"] == {"type": "enabled", "budget_tokens": 4000}
    assert result["max_tokens"] > result["thinking"]["budget_tokens"]
    assert "temperature" not in result


def test_anthropic_adaptive_style_uses_effort_not_budget():
    adaptive = registry.ModelSpec(
        id="s",
        label="S",
        provider="anthropic",
        model="claude-sonnet-5-5",
        reasoning=registry.Reasoning(style="adaptive", effort="medium", max_tokens=8000),
    )
    result = params(adaptive)
    assert result["thinking"] == {"type": "adaptive", "display": "summarized"}
    assert result["output_config"] == {"effort": "medium"} and result["max_tokens"] == 8000
    assert "budget_tokens" not in str(result)


def test_openai_reasoning_uses_responses_api_and_summaries():
    result = params(spec("openai"))
    assert result["use_responses_api"] and result["reasoning"] == {"effort": "medium", "summary": "auto"}


def test_models_without_a_reasoning_entry_get_no_reasoning_settings():
    plain = registry.ModelSpec(id="m", label="M", provider="anthropic", model="x", max_tokens=100)
    assert params(plain) == {"model": "x", "max_tokens": 100}
    assert params(plain.model_copy(update={"provider": "openai"})) == {"model": "x"}


def test_models_json_is_validated():
    with pytest.raises(ValueError):
        registry.ModelSpec.model_validate({"id": "x", "label": "X", "provider": "openai", "model": "m", "typo": 1})


def test_every_configured_model_builds_a_valid_request(monkeypatch):
    # Catches provider-side parameter rules (e.g. budget_tokens rejected on
    # newer models) without a network call.
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    monkeypatch.setenv("OPENAI_API_KEY", "test")
    for s in registry.list_models():
        model = registry.build_model(s)
        if s.provider == "anthropic":
            model._get_request_payload([HumanMessage(content="hi")])


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


def test_reasoning_is_streamed_before_the_answer():
    parts = run_chat("hi")["messages"][-1]["parts"]
    assert [p["type"] for p in parts] == ["reasoning", "text"]


def test_tool_call_is_streamed_and_resolved():
    state = run_chat("please calc 12*(3+4)", tools=["calculator"])
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
    types = [p["type"] for p in state["messages"][-1]["parts"]]
    assert "tool-call" not in types and types[-1] == "text"


def test_second_turn_continues_the_conversation():
    first = run_chat("please calc 2*3", tools=["calculator"])
    second = run_chat("and thanks", state=first, tools=["calculator"])
    roles = [m["role"] for m in second["messages"]]
    assert roles == ["user", "assistant", "user", "assistant"]
    assert second["messages"][-1]["status"] == "complete"


def test_model_failure_is_reported_on_the_message_not_swallowed():
    assistant = run_chat("boom")["messages"][-1]
    assert assistant["status"] == "error"
    assert "scripted failure" in assistant["error"]


@pytest.mark.parametrize(
    "model,fragment",
    [("nope", "Unknown model"), ("claude-haiku-4-5", "ANTHROPIC_API_KEY")],
)
def test_unusable_models_are_reported_on_the_message(model, fragment):
    assistant = run_chat("hi", model=model)["messages"][-1]
    assert assistant["status"] == "error" and fragment in assistant["error"]


def post_chat(text="hi", **body):
    command = {"type": "add-message", "message": {"role": "user", "parts": [{"type": "text", "text": text}]}}
    return client.post("/api/assistant/chat", json={"commands": [command], "settings": {"model": "demo-fake"}, **body})


def test_request_without_a_user_message_is_rejected():
    resp = post_chat("   ")
    assert resp.status_code == 400 and "No user message" in resp.json()["detail"]


@pytest.mark.parametrize(
    "body",
    [
        {"settings": {"model": "demo-fake", "systemPrompt": "x" * (router.MAX_PROMPT_CHARS + 1)}},
        {"settings": {"model": "demo-fake", "tools": ["calculator"] * (router.MAX_TOOLS + 1)}},
        {"state": {"messages": [{}] * (router.MAX_STATE_MESSAGES + 1)}},
    ],
)
def test_oversized_requests_are_rejected(body):
    assert post_chat(**body).status_code == 422


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
                    {
                        "type": "tool-call",
                        "step": 0,
                        "toolCallId": "c1",
                        "toolName": "calculator",
                        "args": {"expression": "1+1"},
                        "status": "complete",
                        "result": "2",
                    },
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
    state = {
        "messages": [
            {
                "id": "2",
                "role": "assistant",
                "parts": [
                    {
                        "type": "tool-call",
                        "step": 0,
                        "toolCallId": "c1",
                        "toolName": "calculator",
                        "args": {},
                        "result": None,
                    }
                ],
            }
        ]
    }
    msgs = state_to_messages(state)
    assert isinstance(msgs[-1], ToolMessage) and "did not complete" in msgs[-1].content


# -- tools -------------------------------------------------------------------
def test_calculator_is_safe_and_correct():
    from api.assistant.tools import calculator

    assert calculator.invoke({"expression": "(12 + 8) * 3 / 4"}) == "15"
    assert calculator.invoke({"expression": "1/0"}).startswith("Error")
    assert calculator.invoke({"expression": "__import__('os').system('echo hi')"}).startswith("Error")
    assert calculator.invoke({"expression": "9**9**9"}).startswith("Error")
    assert calculator.invoke({"expression": "'a' * 3"}).startswith("Error")


def test_weather_formats_forecast_and_picks_place_by_hint(monkeypatch):
    from api.assistant import tools

    seen = []

    def fake_get_json(url, params):
        seen.append((url, params))
        if url == tools._GEOCODE_URL:
            return {
                "results": [
                    {
                        "name": "Houston",
                        "admin1": "Mississippi",
                        "country": "United States",
                        "latitude": 1.0,
                        "longitude": 1.0,
                    },
                    {
                        "name": "Houston",
                        "admin1": "Texas",
                        "country": "United States",
                        "latitude": 29.76,
                        "longitude": -95.37,
                    },
                ]
            }
        return {
            "current": {
                "temperature_2m": 88.1,
                "apparent_temperature": 95.0,
                "relative_humidity_2m": 70,
                "wind_speed_10m": 9.3,
                "weather_code": 2,
            },
            "daily": {
                "temperature_2m_max": [91.0],
                "temperature_2m_min": [76.5],
                "precipitation_probability_max": [20],
            },
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
