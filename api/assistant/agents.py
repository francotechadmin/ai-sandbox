# Agents. An agent is one JSON file in agents/: its name, system prompt, the
# models and tools it may use, and the prompts users may send (see prompts.py).
# Adding an agent means adding a file; the endpoints, streaming, validation and
# rate bounds are shared. A request names its agent (settings.agent, or
# ?agent= on /config); without one the default agent is used.

import json
from pathlib import Path

from pydantic import ConfigDict, Field

from .prompts import PromptConfig

AGENTS_DIR = Path(__file__).parent / "agents"
DEFAULT_AGENT = "assistant"


class UnknownAgentError(LookupError):
    """No agent file with that name."""


class AgentConfig(PromptConfig):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str
    systemPrompt: str = ""
    defaultModel: str | None = None  # a model id from models.json; else the registry default
    models: list[str] | None = None  # ids this agent may use; None = every model
    tools: list[str] = Field(default_factory=list)  # names from tools.py this agent may use


def list_agents() -> list[str]:
    return sorted(p.stem for p in AGENTS_DIR.glob("*.json"))


def get_agent(agent_id: str | None = None) -> tuple[str, AgentConfig]:
    """The (id, config) of the named agent. The id is a file name, so it is checked, not trusted."""
    agent_id = agent_id or DEFAULT_AGENT
    if agent_id not in list_agents():
        raise UnknownAgentError(f"Unknown agent '{agent_id}'.")
    return agent_id, AgentConfig.model_validate(json.loads((AGENTS_DIR / f"{agent_id}.json").read_text()))
