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
  _shared/
    model.py                # LangChain model factory, shared across demos
  <demo_slug>/
    router.py                # FastAPI APIRouter, mounted at /api/<demo-slug>
    documents.py, policy.py, ...  # demo-specific logic, typed

vercel.json                 # rewrites all /api/* to the one FastAPI app
tsconfig.json                # strict TypeScript across the frontend
```

## Demos

| Demo | What it shows |
|---|---|
| [`incident-triage`](./app/incident-triage) | A bounded industrial-operations agent: grounded evidence, a real LangChain LLM call, a deterministic policy gate, full trace. |
| [`assistant`](./app/assistant) | A streaming chat agent: model picker, backend-handled reasoning toggle, live tool-call rendering, and a system prompt edited in the UI. |

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
npm run dev        # Next.js frontend, http://localhost:3000

pip install -r api/requirements-dev.txt
uvicorn api.index:app --reload --port 8000   # FastAPI backend
python -m pytest api/tests                   # backend tests
```

(In production both are served from the same Vercel deployment; locally
they run as two processes since Vercel's dev server isn't available here.)

## Environment variables

```
MODEL_PROVIDER=anthropic        # or "openai" — shared across all demos
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
MODEL_NAME=claude-sonnet-5      # optional override
```

## Tooling notes

Dependencies are on their latest majors (Next 16, React 19, Tailwind 4,
TypeScript 7). Two deliberate exceptions to "newest wins":

- **TypeScript** runs side by side: `tsc` is TypeScript 7 (`@typescript/native`),
  while the `typescript` package is the 6.0 compatibility build
  (`@typescript/typescript6`) because typescript-eslint and Next's type check
  still need the old JS API.
- **ESLint 9, not 10** — the latest `eslint-plugin-react` (pulled in by
  `eslint-config-next`) doesn't support ESLint 10 yet. Revisit when it does.

