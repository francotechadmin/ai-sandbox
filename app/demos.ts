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
    slug: "assistant",
    name: "Assistant",
    description:
      "A streaming chat agent with a model picker, reasoning handled by the backend, tool calls rendered live, and a system prompt you edit in the UI.",
    status: "in-progress",
  },
  {
    slug: "sql",
    name: "World Bank Explorer",
    description:
      "Ask questions about real World Bank data — GDP, life expectancy, internet adoption, and more across 40+ countries since 2000. The agent writes SQL live and results render as charts.",
    status: "live",
  },
];
