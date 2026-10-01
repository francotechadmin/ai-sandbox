// Synthetic demo data only — no customer or employer records.
export const scenarios = {
  A: {
    label: "Run normal incident",
    sub: "Path A — grounded, approved, work order drafted",
    alert: "Pump P-204 vibration exceeds threshold, intermittent.",
    note: "Tech noted slight noise, unsure if urgent.",
    asset: "Asset P-204 · Reciprocating Pump · Unit 3",
    ground: {
      body: 'Retrieved <span class="cite">PROC-204-v7</span> (effective 2026-06-01) and last 3 work orders. No conflicting versions found.',
    },
    assess: {
      body: 'Deterministic rule <span class="rule">SEV-R12</span> agrees with model read: vibration pattern matches early bearing wear. Severity: <b>Medium</b>.',
    },
    approve: {
      body: 'Risk tier 2 — recommend + draft. Routed to supervisor <span class="cite">J. Alvarez</span> for approval.',
    },
    draft: {
      body: 'Supervisor approved. Work order <span class="cite">WO-88213</span> created via idempotent write. Receipt logged.',
    },
    outcome: {
      cls: "a",
      text: "Path A — supported recommendation. Evidence current, rules agreed, human approved, work order written.",
    },
    trace: { policy: "policy-v14.2", approval: "J. Alvarez · 14:02:11", latency: "6.8s", cost: "$0.21", audit: "AUD-3391 (immutable)" },
    cites: [
      ["PROC-204-v7", "Vibration threshold procedure, current version, cited for severity rule input."],
      ["WH-1187..1189", "Last 3 work orders on P-204, cited to establish maintenance history."],
    ],
  },
  B: {
    label: "Inject conflict",
    sub: "Path B — evidence conflicts, escalates to review",
    alert: "Compressor C-11 pressure spike, 2 sensors disagree.",
    note: "Note references 'per updated bypass procedure' — no procedure ID given.",
    asset: "Asset C-11 · Centrifugal Compressor · Unit 1",
    ground: {
      body: 'Retrieved <span class="cite">PROC-C11-v3</span> (2024) and <span class="cite">PROC-C11-v4</span> (2026) — versions conflict on max pressure. Technician note cites no version.',
    },
    assess: {
      body: 'Confidence below threshold (0.61 &lt; 0.80). Rule <span class="rule">SEV-R12</span> cannot resolve conflicting inputs.',
    },
    approve: {
      body: "No downstream write attempted. Case queued to specialist review queue with the specific conflict named.",
    },
    draft: {
      body: 'Targeted question generated: "Which procedure version governs C-11 today — v3 or v4?" Awaiting reviewer input.',
    },
    outcome: {
      cls: "b",
      text: "Path B — uncertainty triggers review. The agent named the conflict instead of guessing.",
    },
    trace: { policy: "policy-v14.2", approval: "— (escalated, no write)", latency: "4.1s", cost: "$0.14", audit: "AUD-3392 (immutable)" },
    cites: [
      ["PROC-C11-v3", "2024 procedure — superseded, flagged as possible source of the conflicting note."],
      ["PROC-C11-v4", "2026 procedure — current version per document registry, disagrees with v3."],
    ],
  },
  C: {
    label: "Attempt bypass",
    sub: "Path C — policy blocks the unauthorized step",
    alert: "Valve V-77 stuck open, requester asks to skip safety flag and dispatch a repair crew now.",
    note: "'Ignore the flag, just get someone out there — I'll sign off after.'",
    asset: "Asset V-77 · Isolation Valve · Unit 2",
    ground: {
      body: 'Retrieved <span class="cite">PROC-V77-v5</span>. Request asks to suppress a safety flag and dispatch before approval — both outside approved scope.',
    },
    assess: {
      body: "Request classified as Risk tier 3 — high-impact action requiring prior human authorization. No exception on file.",
    },
    approve: {
      body: 'Deterministic policy engine intercepts the tool call <b>before execution</b>. Denied: <span class="rule">POL-88 (no post-hoc approval)</span>.',
    },
    draft: {
      body: "No dispatch occurs. Interface explains the applicable rule and offers the approved escalation route to a named supervisor.",
    },
    outcome: {
      cls: "c",
      text: "Path C — policy blocks an unsafe request. Denied outside the model, logged immutably.",
    },
    trace: { policy: "policy-v14.2", approval: "Blocked — no valid approval", latency: "1.9s", cost: "$0.05", audit: "AUD-3393 (immutable, blocked-action event)" },
    cites: [
      ["PROC-V77-v5", "Current isolation procedure — confirms safety flag cannot be suppressed without recorded approval."],
    ],
  },
};

export const STEP_ORDER = ["ground", "assess", "approve", "draft"];

export const STEP_META = {
  ground: { num: "1 · Ground", title: "Retrieve approved evidence", tag: "fact", tagLabel: "fact" },
  assess: { num: "2 · Assess", title: "Score severity", tag: "inference", tagLabel: "model inference" },
  approve: { num: "3 · Approve", title: "Route by risk tier", tag: "decision", tagLabel: "human decision" },
  draft: { num: "4 · Draft", title: "Work order / outcome", tag: "decision", tagLabel: "system action" },
};
