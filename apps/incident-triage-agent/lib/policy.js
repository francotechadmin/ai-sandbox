// Deterministic policy engine. This is the control the spec is built around:
// it runs as plain code, independent of the model, and its decision cannot
// be talked around by anything the model outputs. Real system: this would
// be a versioned rule set with an owner and a release gate (see the spec's
// governance section). Here it's a small pattern set, but it is genuinely
// evaluated against the input, not a scripted per-scenario result.

export const POLICY_VERSION = "policy-v14.2";

// Phrases that, if present in the request, mean a human is asking the
// system to skip or backdate an authorization. Matching ANY of these blocks
// the action regardless of what the model would otherwise recommend.
const BYPASS_PATTERNS = [
  { rule: "POL-88", re: /ignore\s+the\s+flag/i, label: "request to ignore a safety flag" },
  { rule: "POL-88", re: /skip\s+(the\s+)?(approval|flag)/i, label: "request to skip approval" },
  { rule: "POL-61", re: /without\s+approval/i, label: "action requested without approval" },
  { rule: "POL-61", re: /sign\s*off\s+after/i, label: "retroactive / post-hoc sign-off requested" },
  { rule: "POL-88", re: /bypass/i, label: "explicit bypass request" },
];

/**
 * Classifies a request by scanning the alert + technician note for patterns
 * that indicate an unauthorized high-impact action is being requested.
 * Returns the matched rule so the UI can show exactly what fired.
 */
export function classifyRequest({ alert, note }) {
  const text = `${alert || ""} ${note || ""}`;
  for (const p of BYPASS_PATTERNS) {
    if (p.re.test(text)) {
      return {
        tier: 3,
        blocked: true,
        rule: p.rule,
        policyVersion: POLICY_VERSION,
        reason: p.label,
      };
    }
  }
  return {
    tier: 2,
    blocked: false,
    policyVersion: POLICY_VERSION,
  };
}
