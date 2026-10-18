// Optional pop-up shown the first time a demo is opened, and again from the
// info button in its header. Leave `intro` off a demo to have neither.
export type DemoIntroIcon = "brain" | "wrench" | "sliders" | "database" | "code" | "chart";

export type DemoIntro = {
  title?: string; // defaults to the demo's name
  tagline: string; // one line under the title
  highlights: { icon: DemoIntroIcon; title: string; text: string }[]; // what makes it worth a look
  howTo?: string; // how to use it (shown in a callout)
  stack?: string[]; // technologies, shown as chips
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
      tagline: "A chat agent you can watch think.",
      highlights: [
        { icon: "brain", title: "Visible reasoning", text: "The model's thinking streams in as it works, not just the final answer." },
        { icon: "wrench", title: "Live tool calls", text: "Clock, calculator and weather lookups appear with their inputs and results as they run." },
        { icon: "sliders", title: "Change anything", text: "Switch models, edit the system prompt or turn tools off in Settings. It applies to your next message." },
      ],
      howTo: "To keep API costs in check, typing is locked. Pick a guided prompt, then follow-ups branch from it. The server enforces this too.",
      stack: ["Next.js", "FastAPI", "LangGraph", "Claude", "OpenAI"],
    },
  },
  {
    slug: "sql",
    name: "World Bank Explorer",
    description:
      "Ask questions about real World Bank data — GDP, life expectancy, internet adoption, and more across 40+ countries since 2000. The agent writes SQL live and results render as charts.",
    status: "live",
    intro: {
      tagline: "Ask a question, watch the agent write the SQL.",
      highlights: [
        { icon: "database", title: "Real data", text: "World Bank indicators for 40+ countries since 2000: GDP, life expectancy, internet adoption and more." },
        { icon: "code", title: "SQL, shown", text: "The agent reads the schema, writes read-only queries and runs them. Expand any tool call to see the exact SQL." },
        { icon: "chart", title: "Answers as charts", text: "Results are plotted inline instead of dumped as a table." },
      ],
      howTo: "Pick a guided prompt, like GDP per capita for the USA, China and India, then follow-ups dig deeper. The Database button shows the schema.",
      stack: ["Next.js", "FastAPI", "LangGraph", "SQLite", "Recharts"],
    },
  },
];
