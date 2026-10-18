// Optional pop-up shown the first time a demo is opened, and again from the
// info button in its header. Leave `intro` off a demo to have neither.
export type DemoIntro = {
  title?: string; // defaults to the demo's name
  body: string[]; // paragraphs
  tips?: string[]; // short bullets, e.g. things to try
};

export type Demo = {
  slug: string;
  name: string;
  description: string;
  status: "live" | "in-progress";
  intro?: DemoIntro;
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
    intro: {
      body: [
        "A chat agent with tools. Replies stream in live, the model's reasoning is shown as it works, and tool calls render with their inputs and results.",
      ],
      tips: [
        "Pick one of the suggested prompts to see tool calls in action.",
        "Open Settings to change the model, the system prompt, or which tools are on.",
      ],
    },
  },
  {
    slug: "sql",
    name: "World Bank Explorer",
    description:
      "Ask questions about real World Bank data — GDP, life expectancy, internet adoption, and more across 40+ countries since 2000. The agent writes SQL live and results render as charts.",
    status: "live",
    intro: {
      body: [
        "Ask questions about World Bank data in plain English. The agent writes SQL against the dataset, runs it, and shows the results as charts and tables.",
      ],
      tips: [
        "Try a comparison, like life expectancy across a few countries since 2000.",
        "Expand a tool call to see the SQL the agent ran.",
      ],
    },
  },
];
