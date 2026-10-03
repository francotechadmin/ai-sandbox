# The prompts users may send. They live in config/prompts.json, not in code.
#
# The endpoint spends the server's API keys, so by default ("restrict": true)
# the chat only accepts messages that match one of these prompts exactly; the
# UI offers them as suggestions and locks the input bar. This is enforced
# here, on the server, because the UI alone can't stop a hand-made request.
# Set ASSISTANT_ALLOW_ANY_PROMPT=1 to turn the restriction off (local
# development, tests).

import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict

ALLOW_ANY_ENV = "ASSISTANT_ALLOW_ANY_PROMPT"


class Prompt(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    title: str
    label: str = ""
    prompt: str


class PromptConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    restrict: bool = True
    prompts: list[Prompt]


@lru_cache(maxsize=1)
def _load() -> PromptConfig:
    return PromptConfig.model_validate_json((Path(__file__).parent / "config" / "prompts.json").read_text())


def _normalize(text: str) -> str:
    return " ".join(text.split())


def list_prompts() -> list[Prompt]:
    return list(_load().prompts)


def restricted() -> bool:
    return _load().restrict and os.environ.get(ALLOW_ANY_ENV) != "1"


def is_allowed(text: str) -> bool:
    return not restricted() or _normalize(text) in {_normalize(p.prompt) for p in _load().prompts}
