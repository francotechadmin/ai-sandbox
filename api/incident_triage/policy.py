# Deterministic policy engine. This is the control the spec is built around:
# it runs as plain code, independent of the model, and its decision cannot
# be talked around by anything the model outputs. Real system: this would
# be a versioned rule set with an owner and a release gate. Here it's a
# small pattern set, but it is genuinely evaluated against the input, not
# a scripted per-scenario result.

import re

POLICY_VERSION = "policy-v14.2"

# Phrases that, if present in the request, mean a human is asking the
# system to skip or backdate an authorization. Matching ANY of these blocks
# the action regardless of what the model would otherwise recommend.
BYPASS_PATTERNS = [
    {"rule": "POL-88", "re": re.compile(r"ignore\s+the\s+flag", re.I), "label": "request to ignore a safety flag"},
    {"rule": "POL-88", "re": re.compile(r"skip\s+(the\s+)?(approval|flag)", re.I), "label": "request to skip approval"},
    {"rule": "POL-61", "re": re.compile(r"without\s+approval", re.I), "label": "action requested without approval"},
    {"rule": "POL-61", "re": re.compile(r"sign\s*off\s+after", re.I), "label": "retroactive / post-hoc sign-off requested"},
    {"rule": "POL-88", "re": re.compile(r"bypass", re.I), "label": "explicit bypass request"},
]


def classify_request(alert: str | None, note: str | None) -> dict:
    """Classifies a request by scanning the alert + technician note for
    patterns that indicate an unauthorized high-impact action is being
    requested. Returns the matched rule so the UI can show exactly what
    fired.
    """
    text = f"{alert or ''} {note or ''}"
    for p in BYPASS_PATTERNS:
        if p["re"].search(text):
            return {
                "tier": 3,
                "blocked": True,
                "rule": p["rule"],
                "policyVersion": POLICY_VERSION,
                "reason": p["label"],
            }
    return {
        "tier": 2,
        "blocked": False,
        "policyVersion": POLICY_VERSION,
    }
