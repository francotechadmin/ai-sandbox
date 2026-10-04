# AI Sandbox

A set of standalone AI workflow demos showing what an applied AI build can
look like — the kind of thing I build for clients through my consulting
practice. One deployment, one URL, a landing page that links into each demo.

## Live

Deployed on Vercel — _add link here after deploy_.

## Architecture

One Next.js (TypeScript) app serves every demo's frontend as a route, and
one FastAPI (typed Python) app serves every demo's backend as a mounted
router. Both build into a single Vercel project — no per-demo deployments,
no CORS, one thing to monitor.

```
app/
  page.tsx                  # landing page — lists every demo (app/demos.ts)
  demos.ts                  # the registry; add one entry here per new demo
  <demo-slug>/
    page.tsx                # that demo's UI
    lib/                    # frontend-only data for that demo
    README.md               # what the demo shows, what's real vs. simulated

api/
  index.py                  # single FastAPI app; includes one router per demo
  <demo_slug>/
    router.py                # FastAPI APIRouter, mounted at /api/<demo-slug>
    ...                     # demo-specific logic, typed

vercel.json                 # rewrites all /api/* to the one FastAPI app
tsconfig.json                # strict TypeScript across the frontend
```

## Demos

| Demo | What it shows |
|---|---|
| [`assistant`](./app/assistant) | A streaming chat agent: model picker, backend-handled reasoning, live tool-call rendering, and a system prompt edited in the UI. |

## Adding a new demo

1. Add an entry to `app/demos.ts` — name, slug, description.
2. Create `app/<slug>/page.tsx` for the frontend.
3. If it needs a backend, create `api/<slug>/router.py` as a FastAPI
   `APIRouter(prefix="/api/<slug>")`, and mount it in `api/index.py`.
4. Add `app/<slug>/README.md` describing what's real vs. simulated in the
   demo — a CTO reading this repo should be able to tell at a glance what's
   production-shaped and what's a stand-in.
5. One PR, same repo, same deployment. Nothing else to configure.

## Local development

```bash
npm install
pip install -r api/requirements-dev.txt
```

Then launch **Full Stack** from the VS Code Run panel (`.vscode/launch.json`) — it starts Next.js on port 3000 and FastAPI on port 8000 together, with debuggers attached to both.

## Checks (also run in CI)

```bash
npm run lint && npm run typecheck && npm run build
ruff check api && ruff format --check api
python -m pytest api/tests          # backend
npm run test:e2e                    # browser tests: real UI + API, scripted model
```

The browser tests start both servers themselves. Locally set `PYTHON` to your
venv's python (and `CHROMIUM_PATH` to reuse an installed Chromium instead of
`npx playwright install chromium`).

(In production both are served from the same Vercel deployment; locally
they run as two processes since Vercel's dev server isn't available here.)

## Environment variables

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional: LangSmith tracing. Each reply then gets a public "View trace →" link.
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_...
# UUID of the LangSmith tracing project (its Project ID in the UI); looked up by name when unset.
LANGSMITH_PROJECT_ID=...

# Injected automatically when Vercel KV (Upstash) is connected to the project.
# Without these the edge rate limiter is silently skipped (fine for local dev).
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

A model whose key isn't set shows as disabled in the model picker.

The assistant only accepts the conversation trees in
`api/assistant/config/prompts.json` (enforced on the server). Set `ASSISTANT_ALLOW_ANY_PROMPT=1` to allow free
text, e.g. locally.

**Protect the deployment.** The chat endpoint spends these keys and has no
login of its own. Requests are size-limited, restricted to the listed conversations, and rate-limited
at the edge (20 requests / 60 s per IP via Vercel KV). That still leaves the listed conversations
open to anyone who can reach the URL, so keep Vercel Deployment Protection (or another gate) on for
any deployment that holds real keys.

## API logging

The backend writes one JSON line per request to stdout (`api/request_logging.py`),
which Vercel collects under the function's runtime logs:

```json
{"ts":"…","level":"INFO","logger":"api.request","msg":"request","request_id":"…","method":"POST","path":"/api/assistant/chat","status":200,"duration_ms":4210.3,"client_ip":"…","user_agent":"…"}
```

- Every response carries an `x-request-id` header (the caller's `x-request-id`, else Vercel's `x-vercel-id`, else generated); the same id is on every log line emitted during that request.
- Chat turns add `chat start` / `chat end` lines (model, tools, message counts, outcome, duration) and log tracebacks for failures.
- Request and response bodies, prompts and message text are **never** logged.
- `LOG_LEVEL` (default `INFO`) sets verbosity. Add new log lines with `logging.getLogger("api.<demo>")`.

## Tooling notes

Dependencies are on their latest majors (Next 16, React 19, Tailwind 4,
TypeScript 7). Two deliberate exceptions to "newest wins":

- **TypeScript** runs side by side: `tsc` is TypeScript 7 (`@typescript/native`),
  while the `typescript` package is the 6.0 compatibility build
  (`@typescript/typescript6`) because typescript-eslint and Next's type check
  still need the old JS API.
- **ESLint 9, not 10** — the latest `eslint-plugin-react` (pulled in by
  `eslint-config-next`) doesn't support ESLint 10 yet. Revisit when it does.

