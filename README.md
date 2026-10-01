# AI Sandbox

A growing set of small, self-contained demos showing what's possible with applied
AI agent systems — the kind of thing I build for clients through my consulting
practice. Each one is a standalone app under `apps/`, deployed on its own and
meant to be shared as a link someone can click and play with directly.

## Demos

| Demo | What it shows | Live |
|---|---|---|
| [`incident-triage-agent`](./apps/incident-triage-agent) | A bounded industrial-operations agent: grounded evidence, deterministic policy gates, human approval, full audit trail. | _add link after deploy_ |

More workflows will land here over time (document/contract review, customer-support
triage, internal knowledge-base Q&A, and similar patterns), each as its own PR under
`apps/`.

## Structure

```
apps/
  incident-triage-agent/   # Next.js app — deployed independently to Vercel
```

Each app is independent: its own `package.json`, its own deployment. Nothing
here shares a build system or deploy pipeline on purpose — that keeps each
demo easy to hand to a prospective client as a standalone repo later, if
needed.
