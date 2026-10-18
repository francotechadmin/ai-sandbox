// Optional pop-up shown the first time a demo is opened, and again from the
// info button in its header. Leave `intro` off a demo to have neither.
export type DemoIntroIcon = "brain" | "wrench" | "sliders" | "database" | "code" | "chart";

type DemoIntro = {
  title?: string; // defaults to the demo's name
  tagline: string; // one line under the title
  highlights: { icon: DemoIntroIcon; title: string; text: string }[]; // what makes it worth a look
  howTo?: string; // how to use it (shown in a callout)
  stack?: string[]; // technologies, shown as chips
};

type Demo = {
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
    slug: "sql",
    name: "World Bank Explorer",
    description:
      "Ask questions about real World Bank data — GDP, life expectancy, internet adoption, and more across 40+ countries since 2000. The agent writes SQL live and results render as charts.",
    status: "live",
    intro: {
      tagline: "Ask a question about the world and get an answer built from real SQL.",
      highlights: [
        { icon: "database", title: "Real data", text: "Country figures from the World Bank: GDP, life expectancy, internet use and more, for 40+ countries since 2000." },
        { icon: "code", title: "You can see the SQL", text: "The agent looks up the tables, writes a query and runs it. Open any tool call to see exactly what it ran." },
        { icon: "chart", title: "Charts, not tables", text: "Answers come back as charts, so you can read the trend at a glance." },
      ],
      howTo: "Pick one of the starter questions, like GDP per capita for the US, China and India, then choose a follow-up to go deeper. The Database button shows what's in the data.",
      stack: ["Next.js", "FastAPI", "LangGraph", "SQLite", "Recharts"],
    },
  },
  {
    slug: "assistant",
    name: "Assistant",
    description:
      "A streaming chat agent with a model picker, reasoning handled by the backend, tool calls rendered live, and a system prompt you edit in the UI.",
    status: "in-progress",
    intro: {
      tagline: "A starting point for building chat agents that use tools.",
      highlights: [
        { icon: "wrench", title: "Tool use", text: "It can check the time, do math and look up live weather, and you see each call and its result as it happens." },
        { icon: "brain", title: "Reasoning you can follow", text: "The model's thinking streams in alongside the answer instead of arriving all at once." },
        { icon: "sliders", title: "Easy to reshape", text: "Models, the system prompt and tools are settings, not code. Change them in Settings, or add a new agent with a single config file." },
      ],
      howTo: "This is the base template the other demos build on. Typing is locked to starter prompts to keep API costs down, so pick one and follow the suggestions from there.",
      stack: ["Next.js", "FastAPI", "LangGraph", "Claude", "OpenAI"],
    },
  },
];
