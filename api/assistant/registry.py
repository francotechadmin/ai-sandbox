# Model registry for the assistant. The list of models lives in
# config/models.json, not in code: add or change a model by editing that file
# (it is validated against the schemas below).
#
# Reasoning is always on for a model that has a `reasoning` entry. How it is
# switched on differs per provider, so each provider turns the entry into its
# own constructor arguments:
#   anthropic  extended thinking with a token budget (Haiku 4.5). Newer Claude
#              models reject budget_tokens and use adaptive thinking instead,
#              so they need a new branch here.
#   openai     Responses API reasoning effort + summaries

import os
from collections.abc import Callable
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any

from langchain_anthropic import ChatAnthropic
from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

CONFIG_DIR = Path(__file__).parent / "config"


class ModelConfigError(RuntimeError):
    """The requested model can't be used (unknown id, missing API key)."""


class _Config(BaseModel):
    """Base for models.json entries: camelCase keys, unknown keys are errors."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid", frozen=True)


class Reasoning(_Config):
    budget_tokens: int = 4000  # Anthropic
    effort: str = "medium"  # OpenAI
    max_tokens: int | None = None


class ModelSpec(_Config):
    id: str
    label: str
    provider: str
    model: str
    reasoning: Reasoning | None = None
    max_tokens: int | None = None


class _Models(_Config):
    default_model: str
    models: list[ModelSpec]


@dataclass(frozen=True)
class Provider:
    chat_model: Callable[..., BaseChatModel]
    params: Callable[[ModelSpec], dict[str, Any]]
    api_key_env: str | None = None


def _anthropic_params(spec: ModelSpec) -> dict[str, Any]:
    params: dict[str, Any] = {"model": spec.model}
    reasoning = spec.reasoning
    max_tokens = (reasoning and reasoning.max_tokens) or spec.max_tokens
    if reasoning:
        # Extended thinking needs the default temperature and max_tokens > budget.
        params["thinking"] = {"type": "enabled", "budget_tokens": reasoning.budget_tokens}
        max_tokens = max_tokens or reasoning.budget_tokens + 4096
    if max_tokens:
        params["max_tokens"] = max_tokens
    return params


def _openai_params(spec: ModelSpec) -> dict[str, Any]:
    params: dict[str, Any] = {"model": spec.model}
    if spec.reasoning:
        # The Responses API is what exposes streamed reasoning summaries.
        params["use_responses_api"] = True
        params["reasoning"] = {"effort": spec.reasoning.effort, "summary": "auto"}
    return params


PROVIDERS: dict[str, Provider] = {
    "anthropic": Provider(ChatAnthropic, _anthropic_params, "ANTHROPIC_API_KEY"),
    "openai": Provider(ChatOpenAI, _openai_params, "OPENAI_API_KEY"),
}

_extra_models: list[ModelSpec] = []


def register_model(spec: ModelSpec, provider: Provider) -> None:
    """Add a model that isn't in models.json (used by tests for a scripted model)."""
    PROVIDERS[spec.provider] = provider
    _extra_models.append(spec)


@cache
def _load(config_dir: Path) -> _Models:
    return _Models.model_validate_json((config_dir / "models.json").read_text())


def default_system_prompt(config_dir: Path = CONFIG_DIR) -> str:
    path = config_dir / "default_system_prompt.md"
    return path.read_text().strip() if path.exists() else ""


def list_models(config_dir: Path = CONFIG_DIR) -> list[ModelSpec]:
    return [*_load(config_dir).models, *_extra_models]


def default_model_id(config_dir: Path = CONFIG_DIR) -> str:
    ids = [m.id for m in list_models(config_dir)]
    default = _load(config_dir).default_model
    return default if default in ids else ids[0]


def get_spec(model_id: str | None, config_dir: Path = CONFIG_DIR) -> ModelSpec:
    wanted = model_id or default_model_id(config_dir)
    for spec in list_models(config_dir):
        if spec.id == wanted:
            return spec
    raise ModelConfigError(f"Unknown model '{wanted}'.")


def is_available(spec: ModelSpec) -> bool:
    provider = PROVIDERS.get(spec.provider)
    return provider is not None and (provider.api_key_env is None or bool(os.environ.get(provider.api_key_env)))


def build_model(spec: ModelSpec) -> BaseChatModel:
    provider = PROVIDERS.get(spec.provider)
    if provider is None:
        raise ModelConfigError(f"Unsupported provider '{spec.provider}'.")
    if not is_available(spec):
        raise ModelConfigError(f"{spec.label} is unavailable: {provider.api_key_env} is not set on the server.")
    return provider.chat_model(**provider.params(spec))
