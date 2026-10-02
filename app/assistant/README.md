# Assistant

A streaming chat agent. This is the core the other demos can build on: one
chat surface where the model, tools and system prompt are all
chosen at runtime, and everything the agent does (thinking, tool calls) is
rendered as it happens.

## What's actually real here

- **Backend** (`api/assistant/`) — a FastAPI router mounted at
  `/api/assistant`. `POST /chat` runs a LangChain/LangGraph agent
  (`create_agent`) and streams its output to the browser; `GET /config`
  tells the UI which models and tools exist.
- **Models are config, not code** — `api/assistant/config/models.json` lists
  them (Claude Haiku 4.5 and Sonnet 5.5, GPT-5 mini and GPT-5). The file is validated
  on load, so a typo fails loudly. Add a model by adding an entry. A model with no API key on the server shows as disabled in the UI.
- **Reasoning is on by default, handled by the backend** — no UI toggle.
  `api/assistant/registry.py` turns it on per model, using each model's own
  mechanism, chosen by `reasoning.style` in `models.json`: `budget` (Anthropic
  extended thinking with a token budget, e.g. Haiku 4.5), `adaptive`
  (adaptive thinking plus `output_config.effort`, required by Sonnet 5 and
  newer, which reject `budget_tokens`), and OpenAI reasoning effort plus
  streamed summaries via the Responses API. A test builds a request for every
  configured Anthropic model so a model that rejects its parameters fails in
  CI.
- **No hardcoded prompts** — the system prompt, model and
  enabled tools are sent with every request from the settings panel. The only
  prompt text in the repo is the editable starting value in
  `api/assistant/config/default_system_prompt.md`; "Reset" restores it.
  Settings are stored in the browser (`localStorage`).
- **Stateless backend, library-native state** — the whole conversation lives
  in the browser as LangChain messages and is sent back each turn
  (assistant-ui's "Assistant Transport" with its LangGraph helpers:
  `append_langgraph_event` on the server, `convertLangChainMessages` in the
  browser), so there is no custom stream or message conversion code, nothing
  is stored server-side, and it fits a serverless function. The reply streams
  as server-sent events.
- **UI** — assistant-ui's own component kit (`thread.aui` and the reasoning,
  tool-group, markdown and composer elements it uses), copied into
  `components/`, `hooks/` and `lib/` unmodified apart from two marked
  `LOCAL EDIT`s in `thread.aui.tsx` (no add-attachment button; keyboard stays
  closed after sending on touch devices). The kit's theme tokens are mapped to
  the sandbox palette in `app/globals.css`. Update the kit by re-copying the
  files from the assistant-ui repo (`packages/ui/src/components/react`), not by
  editing them; they are excluded from lint. Refresh and Edit show as disabled
  because this stateless backend has no regenerate or edit.

## Tools

`get_current_time`, `calculator` and `get_weather` (`api/assistant/tools.py`)
exist to show tool calls streaming and resolving in the UI. Each can be
switched off in the settings panel; the model only sees the enabled ones.

`get_weather` uses [Open-Meteo](https://open-meteo.com) (free, no API key):
it geocodes the place name, then fetches current conditions and today's
high/low in °F by default or °C on request. Tests mock the HTTP layer.

## Running it

```bash
pip install -r api/requirements-dev.txt
ANTHROPIC_API_KEY=... OPENAI_API_KEY=... uvicorn api.index:app --reload --port 8000
npm run dev   # http://localhost:3000/assistant
```

No API keys? `api/tests/serve_fake.py` is the same API plus a scripted "Demo"
model that streams reasoning, calls the calculator when asked to "calc 2+2",
renders markdown when asked for "markdown", and echoes the system prompt it
received. It lives with the tests and is what they (and the browser tests) use:

```bash
uvicorn api.tests.serve_fake:app --port 8000   # UI without API keys
python -m pytest api/tests                     # backend tests
npm run test:e2e                               # browser tests
```

## Not built yet

RAG, MCP tools, human approval gates, skills,
evals, thread history. Nothing is persisted between page loads except the
settings.
