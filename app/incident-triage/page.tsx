"use client";

import { useState } from "react";
import { INCIDENTS, type IncidentSeed } from "./lib/incidents";

type IncidentKey = keyof typeof INCIDENTS;

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

type RunState = {
  status: "running" | "done" | "error";
  result?: TriageResponse;
  error?: string;
};

const SEVERITY_DOT: Record<Assessment["severity"], string> = {
  Low: "bg-green",
  Medium: "bg-amber",
  High: "bg-amber",
  Critical: "bg-red",
};

const STATUS_PILL: Record<"resolved" | "escalated" | "blocked" | "error", string> = {
  resolved: "bg-[#1c2c24] text-green",
  escalated: "bg-[#2c2617] text-amber",
  blocked: "bg-[#301c1a] text-red",
  error: "bg-[#301c1a] text-red",
};

function statusForResult(result?: TriageResponse): { label: string; style: string } | null {
  if (!result) return null;
  switch (result.outcome.path) {
    case "A":
      return { label: "Resolved", style: STATUS_PILL.resolved };
    case "B":
      return { label: "Escalated", style: STATUS_PILL.escalated };
    case "C":
      return { label: "Blocked", style: STATUS_PILL.blocked };
    default:
      return { label: "Error", style: STATUS_PILL.error };
  }
}

function TimelineEntry({
  index,
  label,
  kind,
  children,
}: {
  index: number;
  label: string;
  kind: "evidence" | "model" | "policy" | "decision";
  children: React.ReactNode;
}) {
  const dot: Record<"evidence" | "model" | "policy" | "decision", string> = {
    evidence: "bg-[#7db3d8]",
    model: "bg-amber",
    policy: "bg-muted",
    decision: "bg-green",
  };
  return (
    <li
      className="relative animate-[fadein_0.3s_ease_forwards] pb-5 pl-6 opacity-0 last:pb-0"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <span className={`absolute left-0 top-1 h-2 w-2 rounded-full ${dot[kind]}`} />
      {index < 3 && <span className="absolute left-[3px] top-4 h-full w-px bg-line" />}
      <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="text-[13px] leading-relaxed text-[#d5d9de]">{children}</div>
    </li>
  );
}

export default function IncidentTriagePage() {
  const [activeKey, setActiveKey] = useState<IncidentKey | null>(null);
  const [runs, setRuns] = useState<Partial<Record<IncidentKey, RunState>>>({});

  const active: IncidentSeed | null = activeKey ? INCIDENTS[activeKey] : null;
  const run = activeKey ? runs[activeKey] : undefined;

  async function open(key: IncidentKey) {
    setActiveKey(key);
    if (runs[key]) return; // already triaged — just show it
    setRuns((prev) => ({ ...prev, [key]: { status: "running" } }));
    const seed = INCIDENTS[key];
    try {
      const res = await fetch("/api/incident-triage/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert: seed.alert, note: seed.note, assetId: seed.assetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      setRuns((prev) => ({ ...prev, [key]: { status: "done", result: data as TriageResponse } }));
    } catch (err) {
      setRuns((prev) => ({
        ...prev,
        [key]: { status: "error", error: err instanceof Error ? err.message : "Request failed." },
      }));
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-6 py-3 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-amber/90 text-xs font-bold text-bg">
            A
          </div>
          <span className="text-sm font-semibold">Atlas Ops Console</span>
        </div>
        <span className="text-xs text-muted">Unit 1–3 · Gulf Coast Facility</span>
      </header>

      <div className="mx-auto grid w-full max-w-[1280px] flex-1 grid-cols-1 gap-5 px-6 py-6 lg:grid-cols-[280px_1fr_300px]">
        {/* Queue */}
        <aside className="rounded-xl border border-line bg-panel p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Incident queue
            </span>
            <span className="rounded-full bg-panel2 px-2 py-0.5 text-[10px] font-semibold text-muted">
              {Object.keys(INCIDENTS).length}
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {(Object.entries(INCIDENTS) as [IncidentKey, IncidentSeed][]).map(([key, inc]) => {
              const r = runs[key];
              const status = statusForResult(r?.result);
              const isActive = key === activeKey;
              return (
                <li key={key}>
                  <button
                    onClick={() => open(key)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? "border-amber/60 bg-panel2"
                        : "border-transparent bg-panel2/40 hover:border-line hover:bg-panel2"
                    }`}
                  >
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted">{inc.id}</span>
                      {status ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.style}`}>
                          {status.label}
                        </span>
                      ) : r?.status === "running" ? (
                        <span className="text-[10px] text-muted">Triaging…</span>
                      ) : (
                        <span className="rounded-full bg-panel px-2 py-0.5 text-[10px] font-semibold text-muted">
                          New
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] font-medium leading-snug text-text">{inc.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted">{inc.assetLabel}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Detail + timeline */}
        <main className="rounded-xl border border-line bg-panel p-5">
          {!active ? (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-muted">
              Select an incident to view triage details.
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-start justify-between border-b border-line pb-4">
                <div>
                  <div className="mb-1 font-mono text-xs text-muted">{active.id}</div>
                  <h1 className="text-lg font-semibold">{active.title}</h1>
                  <p className="mt-1 text-sm text-muted">{active.assetLabel}</p>
                </div>
                {run?.status === "done" && statusForResult(run.result) && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusForResult(run.result)!.style
                    }`}
                  >
                    {statusForResult(run.result)!.label}
                  </span>
                )}
              </div>

              <div className="mb-5 space-y-2 rounded-lg bg-panel2 p-3.5 text-[13px] leading-relaxed">
                <p>
                  <span className="text-muted">Alert — </span>
                  {active.alert}
                </p>
                <p>
                  <span className="text-muted">Technician note — </span>
                  {active.note}
                </p>
              </div>

              {run?.status === "running" && (
                <div className="py-6 text-sm text-muted">Triaging…</div>
              )}

              {run?.status === "error" && (
                <div className="rounded-lg border border-[#4a2a26] bg-[#301c1a] px-3.5 py-3 text-sm text-red">
                  {run.error}
                </div>
              )}

              {run?.status === "done" && run.result && (
                <ol className="mt-2">
                  <TimelineEntry index={0} label="Evidence" kind="evidence">
                    {run.result.evidence.docs.length === 0 ? (
                      "No matching procedure on file for this asset."
                    ) : (
                      <>
                        {run.result.evidence.docs.map((d) => (
                          <div key={d.id + d.version}>
                            <span className="font-mono text-[12px] text-[#7db3d8]">
                              {d.id} {d.version}
                            </span>{" "}
                            — {d.current ? "current" : "superseded"}, effective {d.effective}
                          </div>
                        ))}
                        {run.result.evidence.conflict && (
                          <div className="mt-1 text-amber">
                            Conflicting versions on file for this asset.
                          </div>
                        )}
                      </>
                    )}
                  </TimelineEntry>

                  <TimelineEntry index={1} label="Assessment" kind="model">
                    {run.result.assessment ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${
                              SEVERITY_DOT[run.result.assessment.severity]
                            }`}
                          />
                          {run.result.assessment.severity} severity
                        </span>{" "}
                        <span className="text-muted">
                          ({Math.round(run.result.assessment.confidence * 100)}% confidence)
                        </span>
                        <p className="mt-1">{run.result.assessment.rationale}</p>
                      </>
                    ) : (
                      "No assessment returned."
                    )}
                  </TimelineEntry>

                  <TimelineEntry index={2} label="Policy check" kind="policy">
                    {run.result.policy.blocked ? (
                      <>
                        Blocked —{" "}
                        <span className="font-mono text-[12px] text-amber">
                          {run.result.policy.rule}
                        </span>{" "}
                        · {run.result.policy.reason}
                      </>
                    ) : (
                      `No violation. Risk tier ${run.result.policy.tier}.`
                    )}
                  </TimelineEntry>

                  <TimelineEntry index={3} label="Outcome" kind="decision">
                    {run.result.outcome.text}
                  </TimelineEntry>
                </ol>
              )}
            </div>
          )}
        </main>

        {/* Resolution / trace */}
        <aside className="rounded-xl border border-line bg-panel p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Resolution
          </div>
          {!run || run.status !== "done" || !run.result ? (
            <div className="text-sm text-muted">
              {run?.status === "running" ? "In progress…" : "No resolution yet."}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-panel2 px-3 py-2.5 text-[13px]">{run.result.trace.approval}</div>
              <div className="space-y-1.5 border-t border-line pt-3 font-mono text-[11px] text-muted">
                <div className="flex justify-between">
                  <span>Model</span>
                  <span>{run.result.trace.model}</span>
                </div>
                <div className="flex justify-between">
                  <span>Policy</span>
                  <span>{run.result.trace.policyVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span>Latency</span>
                  <span>{run.result.trace.latencyMs} ms</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
