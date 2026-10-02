import json

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import HumanMessage

from api.assistant import registry, router
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


def chat_events(text, *, state=None, **settings):
    """POST one user message; returns the sent state and the SSE events."""
    body = {
        "state": state or {"messages": []},
        "commands": [{"type": "add-message", "message": {"role": "user", "parts": [{"type": "text", "text": text}]}}],
        "settings": {"model": "demo-fake", **settings},
    }
    resp = client.post("/api/assistant/chat", json=body)
    assert resp.status_code == 200, resp.text
    events = [json.loads(line[len("data: ") :]) for line in resp.text.splitlines() if line.startswith("data: {")]
    return body["state"], events


def run_chat(text, *, state=None, **settings):
    """The chat state (LangChain messages) the browser ends up with after one turn."""
    final, events = chat_events(text, state=json.loads(json.dumps(state or {"messages": []})), **settings)
    for event in events:
        if event["type"] == "update-state":
            apply_ops(final, event["operations"])
    return final["messages"]


def block_types(message):
    return [block["type"] for block in message["content"]]


def text_of(message):
    return "".join(block.get("text", "") for block in message["content"] if block["type"] == "text")


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
    assert "[system: Be terse.]" in text_of(run_chat("hi", systemPrompt="Be terse.")[-1])
    assert "[system: none]" in text_of(run_chat("hi", systemPrompt="   ")[-1])


def test_reasoning_is_streamed_before_the_answer():
    human, ai = run_chat("hi")
    assert human["type"] == "human" and ai["type"] == "ai"
    assert block_types(ai) == ["thinking", "text"]


def test_tool_call_is_streamed_and_resolved():
    human, call, result, answer = run_chat("please calc 12*(3+4)", tools=["calculator"])
    assert [m["type"] for m in (human, call, result, answer)] == ["human", "ai", "tool", "ai"]
    assert call["tool_calls"][0]["name"] == "calculator"
    assert call["tool_calls"][0]["args"] == {"expression": "12*(3+4)"}
    assert result["content"] == "84" and result["tool_call_id"] == call["tool_calls"][0]["id"]
    assert "84" in text_of(answer)


def test_tools_are_only_available_when_enabled():
    messages = run_chat("please calc 1+1", tools=[])
    assert [m["type"] for m in messages] == ["human", "ai"]


def test_no_empty_messages_from_usage_only_chunks():
    # Anthropic ends each reply with a chunk carrying only token usage.
    assert all(m["content"] for m in run_chat("hi"))


def test_second_turn_continues_the_conversation():
    first = run_chat("please calc 2*3", tools=["calculator"])
    second = run_chat("and thanks", state={"messages": first}, tools=["calculator"])
    assert [m["type"] for m in second] == ["human", "ai", "tool", "ai", "human", "ai"]


def errors(text, **settings):
    _, events = chat_events(text, **settings)
    return [e["error"] for e in events if e["type"] == "error"]


def test_model_failure_is_sent_as_a_stream_error():
    assert errors("boom") == ["RuntimeError: scripted failure"]


@pytest.mark.parametrize(
    "model,fragment",
    [("nope", "Unknown model"), ("claude-haiku-4-5", "ANTHROPIC_API_KEY")],
)
def test_unusable_models_are_sent_as_a_stream_error(model, fragment):
    (error,) = errors("hi", model=model)
    assert fragment in error


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
