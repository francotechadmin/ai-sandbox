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
];
