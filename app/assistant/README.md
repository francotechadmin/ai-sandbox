# Assistant

A streaming chat agent. This is the core the other demos can build on: one
chat surface where the model, reasoning, tools and system prompt are all
chosen at runtime, and everything the agent does (thinking, tool calls) is
rendered as it happens.

## What's actually real here

- **Backend** (`api/assistant/`) — a FastAPI router mounted at
  `/api/assistant`. `POST /chat` runs a LangChain/LangGraph agent
  (`create_agent`) and streams its output to the browser; `GET /config`
  tells the UI which models and tools exist.
- **Models are config, not code** — `api/assistant/config/models.json` lists
  them (currently Claude Haiku 4.5 and GPT-5 mini). Add a model by adding an
  entry. A model with no API key on the server shows as disabled in the UI.
- **Reasoning toggle, handled by the backend** — the UI sends a boolean;
  `api/assistant/registry.py` turns it into each provider's own switch
  (Anthropic extended thinking with a token budget; OpenAI reasoning effort
  plus streamed summaries via the Responses API). Provider differences are
  normalised in `api/assistant/stream.py`, so the UI only ever receives
  reasoning / text / tool-call parts.
- **No hardcoded prompts** — the system prompt, model, reasoning toggle and
  enabled tools are sent with every request from the settings panel. The only
  prompt text in the repo is the editable starting value in
  `api/assistant/config/default_system_prompt.md`; "Reset" restores it.
  Settings are stored in the browser (`localStorage`).
- **Stateless backend** — the whole conversation lives in the browser and is
  sent back each turn (assistant-ui's "Assistant Transport"), so nothing is
  stored server-side and it fits a serverless function.
- **UI** — [assistant-ui](https://www.assistant-ui.com) primitives, styled
  with the sandbox's Tailwind theme.

## Tools

`get_current_time` and `calculator` (`api/assistant/tools.py`) exist to show
tool calls streaming and resolving in the UI. Each can be switched off in the
settings panel; the model only sees the enabled ones.

## Running it

```bash
pip install -r api/requirements-dev.txt
ANTHROPIC_API_KEY=... OPENAI_API_KEY=... uvicorn api.index:app --reload --port 8000
npm run dev   # http://localhost:3000/assistant
```

No API keys? `ASSISTANT_FAKE_MODEL=1` adds a scripted "Demo" model that
streams reasoning, calls the calculator when asked to "calc 2+2", and echoes
the system prompt it received. It's what the tests use.

```bash
python -m pytest api/tests
```

## Not built yet

Markdown rendering of replies, RAG, MCP tools, human approval gates, skills,
evals, thread history. Nothing is persisted between page loads except the
settings.
