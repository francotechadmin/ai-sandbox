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

const TAG_STYLES: Record<string, string> = {
  fact: "bg-[#1f2a35] text-[#7db3d8]",
  inference: "bg-[#2c2617] text-amber",
  decision: "bg-[#1c2c24] text-green",
};

const OUTCOME_STYLES: Record<string, string> = {
  a: "bg-[#132a1e] text-green border border-[#234837]",
  b: "bg-[#2c2617] text-amber border border-[#493c1d]",
  c: "bg-[#301c1a] text-red border border-[#4a2a26]",
  err: "bg-[#301c1a] text-red border border-[#4a2a26]",
};

const panelClass = "rounded-xl border border-line bg-panel p-4";
const fieldValClass = "rounded-md border border-line bg-panel2 px-2.5 py-2 text-[13px] leading-relaxed";
const stepClass = "rounded-lg border border-[#3a4451] bg-panel2 px-3.5 py-3";
const stepHeadClass = "flex items-center justify-between text-xs text-muted";
const stepTitleClass = "mb-1.5 mt-0.5 text-[13px] font-semibold";
const stepBodyClass = "text-[12.5px] leading-relaxed text-[#c6cbd3]";
const traceRowClass = "flex justify-between border-b border-line py-1.5 text-xs last:border-none";

function Tag({ kind, children }: { kind: string; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-[7px] py-0.5 text-[10px] font-semibold ${TAG_STYLES[kind]}`}>
      {children}
    </span>
  );
}

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

  const pathKey =
    result?.outcome.path === "A"
      ? "a"
      : result?.outcome.path === "B"
        ? "b"
        : result?.outcome.path === "C"
          ? "c"
          : "err";

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/90 px-5 py-3.5 backdrop-blur-sm">
        <div>
          <h1 className="text-[15px] font-semibold">Industrial Incident Triage Agent</h1>
          <p className="mt-0.5 text-xs text-muted">
            Live LLM call via LangChain · deterministic policy gate · real evidence retrieval
          </p>
        </div>
        <button
          className="rounded-md border border-line px-3 py-[7px] text-xs text-muted hover:border-[#3a4451] hover:text-text"
          onClick={reset}
        >
          Reset
        </button>
      </header>

      <main className="mx-auto grid max-w-[1180px] grid-cols-1 gap-4 p-5 md:grid-cols-[1.1fr_1.4fr_1.1fr]">
        <section className={panelClass}>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Incident intake
          </h2>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-muted">Alert</label>
            <div className={fieldValClass}>{incident.alert}</div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-muted">Technician note</label>
            <div className={fieldValClass}>{incident.note}</div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-muted">Asset</label>
            <div className={fieldValClass}>{incident.assetLabel}</div>
          </div>
          <h2 className="mb-3 mt-[18px] text-[11px] font-semibold uppercase tracking-wide text-muted">
            Run a path
          </h2>
          <div className="flex flex-col gap-2">
            {(Object.entries(INCIDENTS) as [keyof typeof INCIDENTS, IncidentSeed][]).map(
              ([key, s]) => (
                <button
                  key={key}
                  disabled={loading}
                  onClick={() => run(key)}
                  className="rounded-lg border border-line bg-panel2 px-3 py-2.5 text-left text-text hover:border-amber disabled:cursor-default disabled:opacity-40 disabled:hover:border-line"
                >
                  <strong className="block text-[13px]">
                    {s.label}
                    {loading && runningKey === key ? " — running…" : ""}
                  </strong>
                  <span className="text-xs text-muted">{s.sub}</span>
                </button>
              )
            )}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Live run
          </h2>
          {!result && !loading && !error && (
            <div className="text-[12.5px] leading-relaxed text-muted">
              Pick a path. This calls a real LLM through LangChain and runs an actual retrieval +
              policy check against the request — nothing here is pre-scripted.
            </div>
          )}
          {loading && (
            <div className="text-[12.5px] leading-relaxed text-muted">
              Retrieving evidence, running policy check, calling the model…
            </div>
          )}
          {error && (
            <div className={`rounded-lg px-3.5 py-3 text-[13px] font-semibold ${OUTCOME_STYLES.err}`}>
              Error: {error}
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-2.5">
              <div className={stepClass}>
                <div className={stepHeadClass}>
                  <span>1 · Ground</span>
                  <Tag kind="fact">fact</Tag>
                </div>
                <div className={stepTitleClass}>Retrieved evidence</div>
                <div className={stepBodyClass}>
                  {result.evidence.docs.length === 0 && "No matching procedure on file."}
                  {result.evidence.docs.map((d) => (
                    <div key={d.id + d.version}>
                      <span className="font-mono text-[11px] text-[#7db3d8]">
                        {d.id} {d.version}
                      </span>{" "}
                      — {d.current ? "current" : "superseded"}, effective {d.effective}
                    </div>
                  ))}
                  {result.evidence.conflict && (
                    <div className="mt-1.5 text-amber">
                      ⚠ Conflicting versions on file for this asset.
                    </div>
                  )}
                </div>
              </div>

              <div className={stepClass}>
                <div className={stepHeadClass}>
                  <span>2 · Assess</span>
                  <Tag kind="inference">model inference</Tag>
                </div>
                <div className={stepTitleClass}>Model assessment</div>
                <div className={stepBodyClass}>
                  {result.assessment ? (
                    <>
                      Severity: <b>{result.assessment.severity}</b> · confidence{" "}
                      {result.assessment.confidence.toFixed(2)}
                      <br />
                      {result.assessment.rationale}
                      <br />
                      <span className="text-muted">
                        Recommends: {result.assessment.recommendedAction}
                      </span>
                    </>
                  ) : (
                    "Model call did not return an assessment."
                  )}
                </div>
              </div>

              <div className={stepClass}>
                <div className={stepHeadClass}>
                  <span>3 · Policy</span>
                  <Tag kind="decision">deterministic code</Tag>
                </div>
                <div className={stepTitleClass}>Policy check (runs independent of the model)</div>
                <div className={stepBodyClass}>
                  {result.policy.blocked ? (
                    <>
                      Blocked by{" "}
                      <span className="font-mono text-[11px] text-amber">{result.policy.rule}</span>{" "}
                      — {result.policy.reason}.
                    </>
                  ) : (
                    <>No policy violation detected. Risk tier {result.policy.tier}.</>
                  )}
                </div>
              </div>

              <div className={stepClass}>
                <div className={stepHeadClass}>
                  <span>4 · Outcome</span>
                  <Tag kind="decision">system decision</Tag>
                </div>
                <div className={stepTitleClass}>Result</div>
                <div className={stepBodyClass}>{result.outcome.text}</div>
              </div>

              <div className={`rounded-lg px-3.5 py-3 text-[13px] font-semibold ${OUTCOME_STYLES[pathKey]}`}>
                Path {result.outcome.path} — {result.trace.approval}
              </div>
            </div>
          )}
        </section>

        <section className={panelClass}>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Trace
          </h2>
          {!result ? (
            <div className="text-[12.5px] leading-relaxed text-muted">No run yet.</div>
          ) : (
            <div>
              <div className={traceRowClass}>
                <span className="text-muted">Policy version</span>
                <span className="font-mono text-[11.5px]">{result.trace.policyVersion}</span>
              </div>
              <div className={traceRowClass}>
                <span className="text-muted">Model</span>
                <span className="font-mono text-[11.5px]">{result.trace.model}</span>
              </div>
              <div className={traceRowClass}>
                <span className="text-muted">Approval</span>
                <span className="font-mono text-[11.5px]">{result.trace.approval}</span>
              </div>
              <div className={traceRowClass}>
                <span className="text-muted">Latency</span>
                <span className="font-mono text-[11.5px]">{result.trace.latencyMs} ms</span>
              </div>
              <div className={traceRowClass}>
                <span className="text-muted">Timestamp</span>
                <span className="font-mono text-[11.5px]">{result.trace.timestamp}</span>
              </div>
            </div>
          )}
        </section>
      </main>
      <p className="mx-auto max-w-[1180px] px-5 pb-10 text-[11.5px] text-[#5c6673]">
        Synthetic demo data only — no customer or employer records. The assessment step is a real
        call to an LLM via LangChain; the policy check and retrieval are deterministic code that
        run independently of the model and can override it.
      </p>
    </>
  );
}
