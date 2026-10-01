export type Demo = {
  slug: string;
  name: string;
  description: string;
  status: "live" | "in-progress";
};

// Add a new entry here when a demo lands — this is the only place the
// landing page needs to know about it.
export const DEMOS: Demo[] = [
  {
    slug: "incident-triage",
    name: "Industrial Incident Triage Agent",
    description:
      "A bounded operations agent: grounded evidence retrieval, a real LLM assessment via LangChain, and a deterministic policy gate that can override the model.",
    status: "live",
  },
];
