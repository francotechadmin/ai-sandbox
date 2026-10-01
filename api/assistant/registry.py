# Model registry for the assistant. The list of models lives in
# config/models.json, not in code — add or change a model by editing that
# file. Reasoning is a per-request toggle handled entirely here: the UI only
# sends a boolean, and each provider's own switch (Anthropic extended
# thinking, OpenAI reasoning effort + summaries) is set from the registry.

import json
import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

CONFIG_DIR = Path(__file__).parent / "config"

API_KEY_ENV = {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY"}

# Test/demo-only provider: set ASSISTANT_FAKE_MODEL=1 to expose a scripted
# model that needs no API key (used for end-to-end UI tests).
FAKE_MODEL_ID = "demo-fake"


class ModelConfigError(RuntimeError):
    """The requested model can't be used (unknown id, missing API key)."""


@dataclass(frozen=True)
class ModelSpec:
    id: str
    label: str
    provider: str
    model: str
    reasoning: dict[str, Any] = field(default_factory=dict)
    max_tokens: int | None = None

    @property
    def supports_reasoning(self) -> bool:
        return bool(self.reasoning.get("supported"))


@lru_cache(maxsize=1)
def _load_raw() -> dict[str, Any]:
    return json.loads((CONFIG_DIR / "models.json").read_text())


def default_system_prompt() -> str:
    path = CONFIG_DIR / "default_system_prompt.md"
    return path.read_text().strip() if path.exists() else ""


def list_models() -> list[ModelSpec]:
    specs = [
        ModelSpec(
            id=m["id"],
            label=m.get("label", m["id"]),
            provider=m["provider"],
            model=m["model"],
            reasoning=m.get("reasoning", {}),
            max_tokens=m.get("maxTokens"),
        )
        for m in _load_raw()["models"]
    ]
    if os.environ.get("ASSISTANT_FAKE_MODEL") == "1":
        specs.append(
            ModelSpec(
                id=FAKE_MODEL_ID,
                label="Demo (scripted, no API key)",
                provider="fake",
                model="fake",
                reasoning={"supported": True},
            )
        )
    return specs


def default_model_id() -> str:
    configured = _load_raw().get("defaultModel")
    ids = [m.id for m in list_models()]
    if configured in ids:
        return configured
    return ids[0]


def get_spec(model_id: str | None) -> ModelSpec:
    wanted = model_id or default_model_id()
    for spec in list_models():
        if spec.id == wanted:
            return spec
    raise ModelConfigError(f"Unknown model '{wanted}'.")


def is_available(spec: ModelSpec) -> bool:
    if spec.provider == "fake":
        return True
    env = API_KEY_ENV.get(spec.provider)
    return bool(env and os.environ.get(env))


def model_params(spec: ModelSpec, reasoning: bool) -> dict[str, Any]:
    """Provider-specific constructor kwargs for the requested reasoning mode.

    Pure function (no network, no API key) so the toggle logic is unit-testable.
    Reasoning is only switched on when the model's registry entry supports it.
    """
    on = reasoning and spec.supports_reasoning
    cfg = spec.reasoning

    if spec.provider == "anthropic":
        # Extended thinking requires temperature to be left at its default and
        # max_tokens > budget_tokens, so neither is set in the "on" case.
        if on:
            budget = int(cfg.get("budgetTokens", 4000))
            return {
                "model": spec.model,
                "thinking": {"type": "enabled", "budget_tokens": budget},
                "max_tokens": int(cfg.get("maxTokens", budget + 4096)),
            }
        params: dict[str, Any] = {"model": spec.model}
        if spec.max_tokens:
            params["max_tokens"] = spec.max_tokens
        return params

    if spec.provider == "openai":
        # The Responses API is what exposes streamed reasoning summaries.
        if on:
            effort = cfg.get("effortOn", "medium")
            reasoning_cfg: dict[str, Any] = {"effort": effort, "summary": "auto"}
        else:
            reasoning_cfg = {"effort": cfg.get("effortOff", "minimal")}
        return {"model": spec.model, "use_responses_api": True, "reasoning": reasoning_cfg}

    if spec.provider == "fake":
        return {"reasoning": on}

    raise ModelConfigError(f"Unsupported provider '{spec.provider}'.")


def build_model(spec: ModelSpec, reasoning: bool):
    if not is_available(spec):
        env = API_KEY_ENV.get(spec.provider, "an API key")
        raise ModelConfigError(f"{spec.label} is unavailable: {env} is not set on the server.")

    params = model_params(spec, reasoning)

    if spec.provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(**params)
    if spec.provider == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(**params)
    if spec.provider == "fake":
        from .fake_model import ScriptedChatModel

        return ScriptedChatModel(**params)
    raise ModelConfigError(f"Unsupported provider '{spec.provider}'.")
