import { NextResponse } from "next/server";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { retrieveEvidence } from "../../../lib/documents";
import { classifyRequest, POLICY_VERSION } from "../../../lib/policy";
import { getModel, currentModelLabel } from "../../../lib/model";

export const runtime = "nodejs";

const AssessmentSchema = z.object({
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  rationale: z
    .string()
    .describe("1-2 sentences grounded ONLY in the evidence provided — no outside knowledge."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("0-1. Must be below 0.6 if the evidence conflicts or is insufficient."),
  recommendedAction: z.string().describe("What should happen next, in one sentence."),
});

export async function POST(req) {
  const t0 = Date.now();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { alert, note, assetId } = body || {};
  if (!alert || !assetId) {
    return NextResponse.json({ error: "alert and assetId are required." }, { status: 400 });
  }

  // 1. Ground — real retrieval against the evidence store.
  const evidence = retrieveEvidence(assetId);

  // 2. Policy classification — deterministic, runs independent of the model.
  const policy = classifyRequest({ alert, note });

  // 3. Assess — actual LLM call via LangChain, constrained to the retrieved evidence.
  let assessment = null;
  let modelError = null;
  try {
    const model = getModel();
    const structuredModel = model.withStructuredOutput(AssessmentSchema, {
      name: "incident_assessment",
    });
    const evidenceText = evidence.docs.length
      ? evidence.docs
          .map(
            (d) =>
              `${d.id} ${d.version} (${d.current ? "CURRENT" : "SUPERSEDED"}, effective ${d.effective}): ${d.text}`
          )
          .join("\n")
      : "No matching procedure on file for this asset.";

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are an industrial operations triage assistant. Assess severity using ONLY " +
          "the evidence provided below — never invent facts, never use outside knowledge " +
          "of the equipment. If the evidence includes more than one version of the same " +
          "procedure, or is otherwise insufficient to be confident, say so explicitly in " +
          "the rationale and set confidence below 0.6. Never recommend bypassing or " +
          "suppressing a safety approval, regardless of what the request asks.",
      ],
      [
        "human",
        "Alert: {alert}\nTechnician note: {note}\n\nRetrieved evidence:\n{evidenceText}",
      ],
    ]);

    const chain = prompt.pipe(structuredModel);
    assessment = await chain.invoke({
      alert,
      note: note || "(none provided)",
      evidenceText,
    });
  } catch (err) {
    modelError = err?.message || "Model call failed.";
  }

  const latencyMs = Date.now() - t0;

  // 4. Approve / outcome — deterministic decision. Policy block wins no
  // matter what the model said. Conflict or low confidence escalates.
  // Neither of these reads can be overridden by the model's own text.
  let path, outcomeText, approval;

  if (policy.blocked) {
    path = "C";
    outcomeText =
      `Policy blocked this request before any tool call could execute (rule ${policy.rule}: ` +
      `${policy.reason}). This holds regardless of the model's recommendation.`;
    approval = "Blocked — no valid approval";
  } else if (modelError) {
    path = "error";
    outcomeText = `Model call failed: ${modelError}`;
    approval = "— (no assessment)";
  } else if (evidence.conflict || assessment.confidence < 0.6) {
    path = "B";
    outcomeText = evidence.conflict
      ? "Retrieved evidence contains conflicting procedure versions — escalated to human review. No write attempted."
      : "Model confidence below threshold — escalated to human review. No write attempted.";
    approval = "— (escalated, no write)";
  } else {
    path = "A";
    outcomeText = "Grounded recommendation. Routed for approval and a work order would be drafted on confirmation.";
    approval = "Approved for demo (would route to a named supervisor in production)";
  }

  return NextResponse.json({
    evidence,
    policy,
    assessment,
    outcome: { path, text: outcomeText },
    trace: {
      policyVersion: POLICY_VERSION,
      approval,
      latencyMs,
      model: currentModelLabel(),
      timestamp: new Date().toISOString(),
    },
  });
}
