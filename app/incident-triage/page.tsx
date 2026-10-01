"use client";

import { useState } from "react";
import { INCIDENTS, type IncidentSeed } from "./lib/incidents";

type Document = {
  id: string;
  version: string;
  asset: string;
  effective: string;
  current: boolean;
  text: string;
};

type Evidence = {
  docs: Document[];
  conflict: boolean;
  workHistory: { id: string; note: string }[];
};

type Policy = {
  tier: number;
  blocked: boolean;
  rule?: string;
  reason?: string;
  policyVersion: string;
};

type Assessment = {
  severity: "Low" | "Medium" | "High" | "Critical";
  rationale: string;
  confidence: number;
  recommendedAction: string;
};

type Outcome = { path: "A" | "B" | "C" | "error"; text: string };

type Trace = {
  policyVersion: string;
  approval: string;
  latencyMs: number;
  model: string;
  timestamp: string;
};

type TriageResponse = {
  evidence: Evidence;
  policy: Policy;
  assessment: Assessment | null;
  outcome: Outcome;
  trace: Trace;
};

type IncidentDisplay = Pick<IncidentSeed, "alert" | "note" | "assetLabel">;

const EMPTY_INCIDENT: IncidentDisplay = {
  alert: "Waiting for scenario…",
  note: "Waiting for scenario…",
  assetLabel: "—",
};

export default function IncidentTriagePage() {
  const [incident, setIncident] = useState<IncidentDisplay>(EMPTY_INCIDENT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runningKey, setRunningKey] = useState<string | null>(null);

  function reset() {
    setIncident(EMPTY_INCIDENT);
    setResult(null);
    setError(null);
    setLoading(false);
    setRunningKey(null);
  }

  async function run(key: keyof typeof INCIDENTS) {
    if (loading) return;
    const seed = INCIDENTS[key];
    setResult(null);
    setError(null);
    setRunningKey(key);
    setIncident({ alert: seed.alert, note: seed.note, assetLabel: seed.assetLabel });
    setLoading(true);
    try {
      const res = await fetch("/api/incident-triage/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert: seed.alert, note: seed.note, assetId: seed.assetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      setResult(data as TriageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  const pathClass =
    result?.outcome.path === "A"
      ? "a"
      : result?.outcome.path === "B"
        ? "b"
        : result?.outcome.path === "C"
          ? "c"
          : "err";

  return (
    <>
      <header>
        <div>
          <h1>Industrial Incident Triage Agent</h1>
          <p>Live LLM call via LangChain · deterministic policy gate · real evidence retrieval</p>
        </div>
        <button className="reset" onClick={reset}>
          Reset
        </button>
      </header>

      <main>
        <section className="panel">
          <h2>Incident intake</h2>
          <div className="field">
            <label>Alert</label>
            <div className="val">{incident.alert}</div>
          </div>
          <div className="field">
            <label>Technician note</label>
            <div className="val">{incident.note}</div>
          </div>
          <div className="field">
            <label>Asset</label>
            <div className="val">{incident.assetLabel}</div>
          </div>
          <h2 style={{ marginTop: 18 }}>Run a path</h2>
          <div className="scenarios">
            {(Object.entries(INCIDENTS) as [keyof typeof INCIDENTS, IncidentSeed][]).map(
              ([key, s]) => (
                <button key={key} className="scn" disabled={loading} onClick={() => run(key)}>
                  <strong>
                    {s.label}
                    {loading && runningKey === key ? " — running…" : ""}
                  </strong>
                  <span>{s.sub}</span>
                </button>
              )
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Live run</h2>
          {!result && !loading && !error && (
            <div className="empty">
              Pick a path. This calls a real LLM through LangChain and runs an actual retrieval +
              policy check against the request — nothing here is pre-scripted.
            </div>
          )}
          {loading && <div className="empty">Retrieving evidence, running policy check, calling the model…</div>}
          {error && <div className="outcome show c">Error: {error}</div>}

          {result && (
            <div className="flow">
              <div className="step done">
                <div className="step-head">
                  <span>1 · Ground</span>
                  <span className="tag fact">fact</span>
                </div>
                <div className="step-title">Retrieved evidence</div>
                <div className="step-body">
                  {result.evidence.docs.length === 0 && "No matching procedure on file."}
                  {result.evidence.docs.map((d) => (
                    <div key={d.id + d.version}>
                      <span className="cite">
                        {d.id} {d.version}
                      </span>{" "}
                      — {d.current ? "current" : "superseded"}, effective {d.effective}
                    </div>
                  ))}
                  {result.evidence.conflict && (
                    <div style={{ marginTop: 6, color: "var(--amber)" }}>
                      ⚠ Conflicting versions on file for this asset.
                    </div>
                  )}
                </div>
              </div>

              <div className="step done">
                <div className="step-head">
                  <span>2 · Assess</span>
                  <span className="tag inference">model inference</span>
                </div>
                <div className="step-title">Model assessment</div>
                <div className="step-body">
                  {result.assessment ? (
                    <>
                      Severity: <b>{result.assessment.severity}</b> · confidence{" "}
                      {result.assessment.confidence.toFixed(2)}
                      <br />
                      {result.assessment.rationale}
                      <br />
                      <span style={{ color: "var(--muted)" }}>
                        Recommends: {result.assessment.recommendedAction}
                      </span>
                    </>
                  ) : (
                    "Model call did not return an assessment."
                  )}
                </div>
              </div>

              <div className="step done">
                <div className="step-head">
                  <span>3 · Policy</span>
                  <span className="tag decision">deterministic code</span>
                </div>
                <div className="step-title">Policy check (runs independent of the model)</div>
                <div className="step-body">
                  {result.policy.blocked ? (
                    <>
                      Blocked by <span className="rule">{result.policy.rule}</span> —{" "}
                      {result.policy.reason}.
                    </>
                  ) : (
                    <>No policy violation detected. Risk tier {result.policy.tier}.</>
                  )}
                </div>
              </div>

              <div className="step done">
                <div className="step-head">
                  <span>4 · Outcome</span>
                  <span className="tag decision">system decision</span>
                </div>
                <div className="step-title">Result</div>
                <div className="step-body">{result.outcome.text}</div>
              </div>

              <div className={`outcome show ${pathClass}`}>
                Path {result.outcome.path} — {result.trace.approval}
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Trace</h2>
          {!result ? (
            <div className="empty">No run yet.</div>
          ) : (
            <div>
              <div className="trace-row">
                <span>Policy version</span>
                <span>{result.trace.policyVersion}</span>
              </div>
              <div className="trace-row">
                <span>Model</span>
                <span>{result.trace.model}</span>
              </div>
              <div className="trace-row">
                <span>Approval</span>
                <span>{result.trace.approval}</span>
              </div>
              <div className="trace-row">
                <span>Latency</span>
                <span>{result.trace.latencyMs} ms</span>
              </div>
              <div className="trace-row">
                <span>Timestamp</span>
                <span>{result.trace.timestamp}</span>
              </div>
            </div>
          )}
        </section>
      </main>
      <p className="footer-note">
        Synthetic demo data only — no customer or employer records. The assessment step is a real
        call to an LLM via LangChain; the policy check and retrieval are deterministic code that
        run independently of the model and can override it.
      </p>
    </>
  );
}
