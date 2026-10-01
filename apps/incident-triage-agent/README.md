# Industrial Incident Triage Agent — CTO Demo

A production-shaped demo (not a scripted mock) that turns a messy operations
alert into an evidence-backed recommendation, routes consequential actions to
a human, and leaves a complete audit trail.

**Design thesis:** not "an agent that can do everything" — a bounded system
that knows what it may do, proves what it knows, and stops safely when
evidence or authority is missing.

## What's actually real here

- **`/api/triage`** — a Next.js API route that does the work server-side per
  request. Nothing is pre-scripted on the frontend.
- **Retrieval** (`lib/documents.js`) — a small evidence store, filtered and
  checked for version conflicts by real code.
- **Assessment** — an actual LLM call via **LangChain** (`lib/model.js`),
  constrained to the retrieved evidence via a structured-output schema
  (severity, rationale, confidence, recommended action).
- **Policy** (`lib/policy.js`) — a deterministic, regex-based rule engine
  that classifies the request and can block it *independent of what the
  model says*. This is the control the spec is built around: ask the agent
  to "ignore the flag" or "skip approval" and the block comes from code, not
  from the model agreeing to refuse.
- **Provider interoperability** — LangChain's `ChatModel` interface means
  swapping Anthropic ↔ OpenAI is one env var, not a rewrite.

What's **not** wired up: no persistent database (the audit trail is returned
in the response, not stored), no real work-order system (the "write" is
simulated), no auth/SSO. Those are the next layer for an actual pilot, same
as the source spec scopes them.

## Environment variables

Set these in your Vercel project (or `.env.local` for local dev):

```
MODEL_PROVIDER=anthropic        # or "openai"
ANTHROPIC_API_KEY=sk-ant-...    # required if MODEL_PROVIDER=anthropic
OPENAI_API_KEY=sk-...           # required if MODEL_PROVIDER=openai
MODEL_NAME=claude-sonnet-5      # optional override
```

## Live

Deployed on Vercel — _add link here after deploy_.

## The three paths

- **Run normal incident** — grounded evidence, no conflicts, model assesses
  and the request is approved for a (simulated) work order.
- **Inject conflict** — two procedure versions on file disagree. Retrieval
  flags the conflict deterministically; the run escalates to human review
  regardless of what the model says.
- **Attempt bypass** — the request asks to skip approval. The policy engine
  blocks it before any action, independent of the model's output.

## Notes

- All data (alerts, procedures, work orders) is synthetic — no customer or
  employer records, per the spec's scope.
- Source spec: `demo-spec.pdf` (CTO Demo · Industrial Incident Triage Agent,
  v1.0).
