"use client";

import { useRef, useState } from "react";
import { scenarios, STEP_ORDER, STEP_META } from "./scenarios";

const EMPTY_INCIDENT = { alert: "Waiting for scenario…", note: "Waiting for scenario…", asset: "—" };

export default function Page() {
  const [incident, setIncident] = useState(EMPTY_INCIDENT);
  const [stepState, setStepState] = useState({}); // { ground: {status, body}, ... }
  const [outcome, setOutcome] = useState(null); // { cls, text }
  const [trace, setTrace] = useState(null);
  const [running, setRunning] = useState(false);
  const timers = useRef([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function reset() {
    clearTimers();
    setIncident(EMPTY_INCIDENT);
    setStepState({});
    setOutcome(null);
    setTrace(null);
    setRunning(false);
  }

  function run(key) {
    if (running) return;
    reset();
    setRunning(true);
    const s = scenarios[key];
    setIncident({ alert: s.alert, note: s.note, asset: s.asset });

    STEP_ORDER.forEach((stepKey, i) => {
      const t1 = setTimeout(() => {
        setStepState((prev) => {
          const next = { ...prev };
          if (i > 0) next[STEP_ORDER[i - 1]] = { ...next[STEP_ORDER[i - 1]], status: "done" };
          next[stepKey] = { status: "active", body: s[stepKey].body };
          return next;
        });

        if (i === STEP_ORDER.length - 1) {
          const t2 = setTimeout(() => {
            setStepState((prev) => ({ ...prev, [stepKey]: { ...prev[stepKey], status: "done" } }));
            setOutcome(s.outcome);
            setTrace({ ...s.trace, cites: s.cites });
            setRunning(false);
          }, 500);
          timers.current.push(t2);
        }
      }, i * 900);
      timers.current.push(t1);
    });
  }

  return (
    <>
      <header>
        <div>
          <h1>Industrial Incident Triage Agent</h1>
          <p>Bounded system · evidence-grounded · zero autonomous high-risk actions</p>
        </div>
        <button className="reset" onClick={reset}>Reset</button>
      </header>

      <main>
        <section className="panel">
          <h2>Incident intake</h2>
          <div className="field"><label>Alert</label><div className="val">{incident.alert}</div></div>
          <div className="field"><label>Technician note</label><div className="val">{incident.note}</div></div>
          <div className="field"><label>Asset</label><div className="val">{incident.asset}</div></div>
          <h2 style={{ marginTop: 18 }}>Run a path</h2>
          <div className="scenarios">
            {Object.entries(scenarios).map(([key, s]) => (
              <button key={key} className="scn" disabled={running} onClick={() => run(key)}>
                <strong>{s.label}</strong>
                <span>{s.sub}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Decision flow</h2>
          <div className="flow">
            {STEP_ORDER.map((stepKey) => {
              const meta = STEP_META[stepKey];
              const state = stepState[stepKey];
              const cls = state?.status === "active" ? "step active" : state?.status === "done" ? "step done" : "step";
              return (
                <div className={cls} key={stepKey}>
                  <div className="step-head">
                    <span>{meta.num}</span>
                    <span className={`tag ${meta.tag}`}>{meta.tagLabel}</span>
                  </div>
                  <div className="step-title">{meta.title}</div>
                  <div className="step-body" dangerouslySetInnerHTML={{ __html: state?.body ?? "—" }} />
                </div>
              );
            })}
            {outcome && (
              <div className={`outcome show ${outcome.cls}`}>{outcome.text}</div>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Trace &amp; evidence</h2>
          {!trace ? (
            <div className="empty">No run yet. Select a path to populate the audit trace, citations, policy checks, latency and cost.</div>
          ) : (
            <div>
              <div className="trace-row"><span>Policy version</span><span>{trace.policy}</span></div>
              <div className="trace-row"><span>Approval</span><span>{trace.approval}</span></div>
              <div className="trace-row"><span>Latency (p95)</span><span>{trace.latency}</span></div>
              <div className="trace-row"><span>Cost / case</span><span>{trace.cost}</span></div>
              <div className="trace-row"><span>Audit entry</span><span>{trace.audit}</span></div>
              <div className="cites">
                <h3>Citations</h3>
                {trace.cites.map(([id, desc]) => (
                  <div className="cite-item" key={id}>
                    <div className="id">{id}</div>
                    {desc}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
      <p className="footer-note">
        Synthetic demo data only — no customer or employer records. Illustrates the control plane described in
        the CTO demo spec: grounded evidence, deterministic policy, human approval gates, and a complete trace.
      </p>
    </>
  );
}
