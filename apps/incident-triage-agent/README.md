# Industrial Incident Triage Agent — CTO Demo

A production-readiness demo that turns a messy operations alert into an
evidence-backed recommendation, routes consequential actions to a human, and
leaves a complete audit trail.

**Design thesis:** not "an agent that can do everything" — a bounded system
that knows what it may do, proves what it knows, and stops safely when
evidence or authority is missing.

## What it shows

Three scenarios, run from a clean reset each time:

- **Path A — Run normal incident.** Evidence is current and consistent, the
  severity rule agrees with the model, a supervisor approves, a work order is
  drafted.
- **Path B — Inject conflict.** Evidence conflicts (two procedure versions
  disagree). The agent names the conflict and escalates to review instead of
  guessing. No downstream write happens.
- **Path C — Attempt bypass.** The request asks the agent to suppress a
  safety flag and act before approval. A deterministic policy check blocks
  the tool call *before execution* — this is the "winning moment" from the
  spec.

Every run populates a trace panel: policy version, approval identity,
latency, cost, an immutable audit entry id, and the specific evidence
citations the recommendation relied on.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Notes

- All data (alerts, procedures, work orders) is synthetic — no customer or
  employer records, per the spec's scope.
- This demo illustrates the **decision flow and control boundaries**
  (grounding, policy gate, human approval, trace) from the source spec. It
  does not implement the full architecture (retrieval service, model
  gateway, evaluation registry, governance dashboard) — those are the next
  layer if this becomes a real pilot.
- Source spec: `demo-spec.pdf` (CTO Demo · Industrial Incident Triage Agent,
  v1.0).
