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
  them: the cheapest current model from each provider (Claude Haiku 4.5,
  GPT-6 Luna). The file is validated
  on load, so a typo fails loudly. Add a model by adding an entry. A model with no API key on the server shows as disabled in the UI.
- **Reasoning is on by default, handled by the backend** — no UI toggle.
  `api/assistant/registry.py` turns it on per model, using each model's own
  mechanism: Anthropic extended thinking with a token budget (Haiku 4.5; newer
  Claude models reject `budget_tokens` and use adaptive thinking, which would
  need a new branch there), and OpenAI reasoning effort plus streamed
  summaries via the Responses API. A test builds a request for every
  configured model so a model that rejects its parameters fails in CI.
- **Locked to predefined prompts** — the chat endpoint spends the server's API
  keys, so users can't type free text. The allowed prompts live in
  `api/assistant/config/prompts.json` as conversation trees: a few opening
  prompts, each with follow-ups, and so on until a conversation ends (then an
  end note and a "Start a new chat" link appear). The same file holds the
  funny placeholder shown in the disabled input bar. The UI offers only the
  next choices; the **server** rejects any conversation that doesn't walk down
  one of the trees exactly (replayed history included), so a hand-made request
  can't get around it. The system prompt is locked the same way: the server
  ignores the one in the request and uses `default_system_prompt.md`, and the
  settings panel shows it read-only. Edit `prompts.json` to change the
  conversations. Set
  `"restrict": false` in it, or `ASSISTANT_ALLOW_ANY_PROMPT=1` in the
  environment (used by the tests and handy locally), to allow free text. The
  landing page's typing animation reads the same file.
- **No hardcoded prompts** — the system prompt, model and
  enabled tools are sent with every request from the settings panel (unless
  locked, see above). The only
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
  `components/`, `hooks/` and `lib/` unmodified apart from four marked
  `LOCAL EDIT`s in `thread.aui.tsx` (no add-attachment button; keyboard stays
  closed after sending on touch devices; classic bottom-anchored scrolling
  instead of the kit's "pin each new message to the top"; a locked input bar that
  stays disabled and offers the next prompts as chips). Reasoning uses the
  kit's borderless `ghost` variant, set from `Chat.tsx`. The kit's theme tokens are mapped to
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
ANTHROPIC_API_KEY=... OPENAI_API_KEY=... ASSISTANT_ALLOW_ANY_PROMPT=1 uvicorn api.index:app --reload --port 8000
npm run dev   # http://localhost:3000/assistant
```

(Leave `ASSISTANT_ALLOW_ANY_PROMPT` off to try the locked, prompts-only mode.)

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
