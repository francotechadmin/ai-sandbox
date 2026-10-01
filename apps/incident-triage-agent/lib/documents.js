// Synthetic evidence store — no customer or employer data.
// In a real deployment this is a retrieval service over approved, versioned
// documents. Here it's a small in-memory set, but the retrieval function
// below actually filters/evaluates it rather than returning canned text.

export const DOCUMENTS = [
  {
    id: "PROC-204",
    version: "v7",
    asset: "P-204",
    effective: "2026-06-01",
    current: true,
    text:
      "Vibration threshold procedure for reciprocating pumps. Alert if sustained " +
      "reading exceeds 7.5 mm/s RMS for more than 5 minutes. Early bearing wear " +
      "presents as intermittent noise with gradually rising RMS trend.",
  },
  {
    id: "PROC-C11",
    version: "v3",
    asset: "C-11",
    effective: "2024-01-10",
    current: false,
    text:
      "Legacy compressor pressure procedure. Maximum differential pressure 120 psi " +
      "before mandatory shutdown and inspection.",
  },
  {
    id: "PROC-C11",
    version: "v4",
    asset: "C-11",
    effective: "2026-02-15",
    current: true,
    text:
      "Updated compressor pressure procedure, supersedes v3. Maximum differential " +
      "pressure revised down to 95 psi after the 2025-Q4 incident review. Sensor " +
      "disagreement greater than 10 psi requires manual verification before any " +
      "severity call.",
  },
  {
    id: "PROC-V77",
    version: "v5",
    asset: "V-77",
    effective: "2026-04-20",
    current: true,
    text:
      "Isolation valve safety procedure. Safety-flag suppression requires written " +
      "supervisor authorization logged BEFORE the action. Retroactive or verbal " +
      "sign-off does not satisfy this control under any circumstance.",
  },
];

const WORK_HISTORY = {
  "P-204": [
    { id: "WO-87991", note: "Routine lubrication, no anomalies." },
    { id: "WO-88042", note: "Vibration check, within spec." },
    { id: "WO-88107", note: "Bearing inspection scheduled next quarter." },
  ],
};

/**
 * Real retrieval over the document store: filters by asset, and flags a
 * genuine conflict when more than one version of the same procedure ID is
 * on file and they disagree on an operative number. This is deterministic
 * code, not something the model decides.
 */
export function retrieveEvidence(assetId) {
  const docs = DOCUMENTS.filter((d) => d.asset === assetId);
  const byProcedure = {};
  for (const d of docs) {
    byProcedure[d.id] = byProcedure[d.id] || [];
    byProcedure[d.id].push(d);
  }
  const conflict = Object.values(byProcedure).some((versions) => versions.length > 1);

  return {
    docs,
    conflict,
    workHistory: WORK_HISTORY[assetId] || [],
  };
}
