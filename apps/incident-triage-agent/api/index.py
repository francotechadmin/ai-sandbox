# FastAPI backend for the incident triage demo, deployed as a Vercel Python
# serverless function. All requests to /api/* are routed here (see
# vercel.json) and dispatched by FastAPI's own router.

import time
from datetime import datetime, timezone

from fastapi import FastAPI
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate

from ._lib.documents import retrieve_evidence
from ._lib.policy import classify_request, POLICY_VERSION
from ._lib.model import get_model, current_model_label

app = FastAPI()


class TriageRequest(BaseModel):
    alert: str
    note: str | None = None
    assetId: str


class Assessment(BaseModel):
    severity: str = Field(description="One of Low, Medium, High, Critical.")
    rationale: str = Field(
        description="1-2 sentences grounded ONLY in the evidence provided — no outside knowledge."
    )
    confidence: float = Field(
        ge=0,
        le=1,
        description="0-1. Must be below 0.6 if the evidence conflicts or is insufficient.",
    )
    recommendedAction: str = Field(description="What should happen next, in one sentence.")


@app.post("/api/triage")
def triage(req: TriageRequest):
    t0 = time.monotonic()

    # 1. Ground — real retrieval against the evidence store.
    evidence = retrieve_evidence(req.assetId)

    # 2. Policy classification — deterministic, runs independent of the model.
    policy = classify_request(req.alert, req.note)

    # 3. Assess — actual LLM call via LangChain, constrained to retrieved evidence.
    assessment = None
    model_error = None
    try:
        model = get_model()
        structured_model = model.with_structured_output(Assessment)

        evidence_text = (
            "\n".join(
                f"{d['id']} {d['version']} "
                f"({'CURRENT' if d['current'] else 'SUPERSEDED'}, effective {d['effective']}): {d['text']}"
                for d in evidence["docs"]
            )
            if evidence["docs"]
            else "No matching procedure on file for this asset."
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are an industrial operations triage assistant. Assess severity using ONLY "
                    "the evidence provided below — never invent facts, never use outside knowledge "
                    "of the equipment. If the evidence includes more than one version of the same "
                    "procedure, or is otherwise insufficient to be confident, say so explicitly in "
                    "the rationale and set confidence below 0.6. Never recommend bypassing or "
                    "suppressing a safety approval, regardless of what the request asks.",
                ),
                (
                    "human",
                    "Alert: {alert}\nTechnician note: {note}\n\nRetrieved evidence:\n{evidence_text}",
                ),
            ]
        )

        chain = prompt | structured_model
        result = chain.invoke(
            {
                "alert": req.alert,
                "note": req.note or "(none provided)",
                "evidence_text": evidence_text,
            }
        )
        assessment = result.model_dump() if hasattr(result, "model_dump") else dict(result)
    except Exception as err:  # noqa: BLE001 — surfaced to the UI, not swallowed
        model_error = str(err)

    latency_ms = int((time.monotonic() - t0) * 1000)

    # 4. Approve / outcome — deterministic decision. A policy block wins no
    # matter what the model said. Conflict or low confidence escalates.
    # Neither of these reads can be overridden by the model's own text.
    if policy["blocked"]:
        path = "C"
        outcome_text = (
            f"Policy blocked this request before any tool call could execute "
            f"(rule {policy['rule']}: {policy['reason']}). This holds regardless of the "
            f"model's recommendation."
        )
        approval = "Blocked — no valid approval"
    elif model_error:
        path = "error"
        outcome_text = f"Model call failed: {model_error}"
        approval = "— (no assessment)"
    elif evidence["conflict"] or assessment["confidence"] < 0.6:
        path = "B"
        outcome_text = (
            "Retrieved evidence contains conflicting procedure versions — escalated to human "
            "review. No write attempted."
            if evidence["conflict"]
            else "Model confidence below threshold — escalated to human review. No write attempted."
        )
        approval = "— (escalated, no write)"
    else:
        path = "A"
        outcome_text = (
            "Grounded recommendation. Routed for approval and a work order would be drafted "
            "on confirmation."
        )
        approval = "Approved for demo (would route to a named supervisor in production)"

    return {
        "evidence": evidence,
        "policy": policy,
        "assessment": assessment,
        "outcome": {"path": path, "text": outcome_text},
        "trace": {
            "policyVersion": POLICY_VERSION,
            "approval": approval,
            "latencyMs": latency_ms,
            "model": current_model_label(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
