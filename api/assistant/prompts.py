# The prompts users may send. They live in config/prompts.json, not in code, as
# conversation trees: a few opening prompts, each with follow-ups, and so on
# until a conversation ends.
#
# The endpoint spends the server's API keys, so by default ("restrict": true)
# the chat only accepts a conversation that walks down one of these trees
# exactly (an opening prompt, then one of its follow-ups, ...); the UI offers
# the next choices and locks the input bar. This is enforced here, on the
# server, because the UI alone can't stop a hand-made request.
# Set ASSISTANT_ALLOW_ANY_PROMPT=1 to turn the restriction off (local
# development, tests).

import os
from functools import cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict

ALLOW_ANY_ENV = "ASSISTANT_ALLOW_ANY_PROMPT"
DEFAULT_CONFIG_DIR = Path(__file__).parent / "config"


class Prompt(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    title: str  # short button text
    label: str = ""  # muted text after the title on the opening list
    prompt: str  # the message that is sent
    followUps: list["Prompt"] = []


class PromptConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    restrict: bool = True
    placeholder: str  # shown in the locked input bar
    endNote: str  # shown when a conversation has run out of follow-ups
    prompts: list[Prompt]


@cache
def get_config(config_dir: Path = DEFAULT_CONFIG_DIR) -> PromptConfig:
    return PromptConfig.model_validate_json((config_dir / "prompts.json").read_text())


def _normalize(text: str) -> str:
    return " ".join(text.split())


def restricted(config_dir: Path = DEFAULT_CONFIG_DIR) -> bool:
    return get_config(config_dir).restrict and os.environ.get(ALLOW_ANY_ENV) != "1"


def allows(texts: list[str], config_dir: Path = DEFAULT_CONFIG_DIR) -> bool:
    """Whether these user messages, in order, walk down one of the trees."""
    if not restricted(config_dir):
        return True
    choices = get_config(config_dir).prompts
    for text in texts:
        node = next((p for p in choices if _normalize(p.prompt) == _normalize(text)), None)
        if node is None:
            return False
        choices = node.followUps
    return True
