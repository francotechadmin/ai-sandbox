# Industrial Incident Triage Agent

A production-shaped demo (not a scripted mock) that turns a messy operations
alert into an evidence-backed recommendation, routes consequential actions to
a human, and leaves a complete audit trail.

**Design thesis:** not "an agent that can do everything" — a bounded system
that knows what it may do, proves what it knows, and stops safely when
evidence or authority is missing.

## What's actually real here

- **`api/incident_triage/router.py`** — a FastAPI router that does the work
  server-side per request, mounted at `/api/incident-triage/triage`.
  Nothing is pre-scripted on the frontend.
- **Retrieval** (`api/incident_triage/documents.py`) — a small evidence
  store, filtered and checked for version conflicts by real code.
- **Assessment** — an actual LLM call via LangChain, constrained to the
  retrieved evidence via a structured-output schema (severity, rationale,
  confidence, recommended action).
- **Policy** (`api/incident_triage/policy.py`) — a deterministic,
  regex-based rule engine that classifies the request and can block it
  *independent of what the model says*. This is the control the spec is
  built around: ask the agent to "ignore the flag" or "skip approval" and
  the block comes from code, not from the model agreeing to refuse.
- **Provider interoperability** (`api/_shared/model.py`) — a LangChain model
  factory shared across every demo in this sandbox; swapping Anthropic ↔
  OpenAI is one env var, not a rewrite.

What's **not** wired up: no persistent database (the audit trail is returned
in the response, not stored), no real work-order system (the "write" is
simulated), no auth/SSO. Those are the next layer for an actual pilot, same
as the source spec scopes them.

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
  employer records.
- Source spec: `demo-spec.pdf` (CTO Demo · Industrial Incident Triage Agent,
  v1.0).
- Verified in this environment: the FastAPI router imports and mounts
  correctly, retrieval + policy logic pass direct assertions for all three
  scenarios, and both the policy-blocked and normal-request paths were
  exercised live over HTTP. **Not verified here**: an actual successful LLM
  call — no provider API key was available in this sandbox, so the live
  path was only confirmed to fail gracefully with a clear error. Run it
  with a real key before demoing to confirm the assessment step itself.
