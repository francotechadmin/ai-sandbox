import Link from "next/link";
import { ArrowUpRightIcon, BrainIcon, CheckIcon, WrenchIcon } from "lucide-react";
import { DEMOS } from "./demos";
import { PromptLauncher } from "./_components/PromptLauncher";

const REPO = "https://github.com/francotechadmin/ai-sandbox";
const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

// A small, static picture of the chat UI for the demo card. Shapes only; it
// makes no claims about real output.
function AssistantPreview() {
  return (
    <div
      className="relative flex h-52 items-center justify-center overflow-hidden bg-cover bg-[position:75%_35%] sm:h-60"
      style={{ backgroundImage: "url(/hero-flow.svg)" }}
      aria-hidden
    >
      <div className="absolute inset-0 bg-void/45" />
      <div className="relative flex w-[78%] max-w-sm flex-col gap-2.5 rounded-2xl border border-white/10 bg-void/75 p-4 backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-1">
        <div className="ms-auto h-7 w-3/5 rounded-full bg-white/12" />
        <div className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-bone/60">
          <BrainIcon className="size-3.5" />
          Reasoning
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-bone/60">
          <WrenchIcon className="size-3.5" />
          <span className="font-mono text-tool">get_weather</span>
          <CheckIcon className="ms-auto size-3.5 text-green" />
        </div>
        <div className="h-2 w-full rounded-full bg-white/15" />
        <div className="h-2 w-4/5 rounded-full bg-white/15" />
        <div className="h-2 w-2/5 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-void text-bone">
      <section className="relative isolate overflow-hidden">
        {/* Generated pattern (scripts/generate-hero-pattern.py), darkened on the left for legibility and faded into the page below. */}
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url(/hero-flow.svg)" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,7,12,0.82)_0%,rgba(6,7,12,0.35)_55%,rgba(6,7,12,0)_100%),linear-gradient(0deg,var(--color-void)_0%,transparent_38%)]"
          aria-hidden
        />

        <div className="mx-auto flex min-h-[36rem] w-full max-w-[1200px] flex-col px-5 pb-16 pt-6 sm:min-h-[44rem] sm:px-10 sm:pb-24">
          <header className="flex items-center justify-between text-[15px]">
            <span className="font-medium tracking-tight">AI Sandbox</span>
            <a
              href={REPO}
              className="text-bone/70 underline decoration-white/25 underline-offset-4 transition-colors hover:text-bone hover:decoration-bone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
            >
              GitHub
            </a>
          </header>

          <div className="mt-auto pt-24">
            <h1
              className="rise font-display text-[clamp(3rem,8.4vw,7.25rem)] font-medium leading-[1] tracking-[-0.05em]"
              style={delay(0)}
            >
              AI agents you
              <br />
              can watch work.
            </h1>
            <p className="rise mt-7 max-w-[30rem] text-lg leading-relaxed text-bone/75" style={delay(0.15)}>
              A sandbox of working builds. Choose the model, rewrite the prompt, switch tools on and off, and see
              the reasoning as it happens.
            </p>
            <div className="rise mt-10 max-w-[44rem]" style={delay(0.3)}>
              <PromptLauncher />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 pb-12 pt-10 sm:px-10 sm:pt-16" aria-labelledby="demos-heading">
        <h2 id="demos-heading" className="font-display text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
          Demos
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {DEMOS.map((demo) => (
            <li key={demo.slug}>
              <Link
                href={`/${demo.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/25 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
              >
                <AssistantPreview />
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-2xl font-medium tracking-[-0.03em] sm:text-3xl">{demo.name}</h3>
                    <ArrowUpRightIcon
                      className="mt-1 size-6 shrink-0 text-bone/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bone"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed text-bone/65">{demo.description}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm text-bone/80">
                    <span
                      className={`size-2 rounded-full ${demo.status === "live" ? "bg-green shadow-[0_0_10px_var(--color-green)]" : "bg-amber shadow-[0_0_10px_var(--color-amber)]"}`}
                      aria-hidden
                    />
                    {demo.status === "live" ? "Live" : "In progress"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
          <li className="hidden md:block">
            <div className="flex h-full min-h-72 flex-col items-start justify-end rounded-3xl border border-dashed border-white/15 p-7">
              <h3 className="font-display text-2xl font-medium tracking-[-0.03em] text-bone/70 sm:text-3xl">More soon</h3>
              <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-bone/45">
                Each new demo ships as a working build and shows up here.
              </p>
            </div>
          </li>
        </ul>
        <footer className="mt-16 text-sm text-bone/45">Built by Gabriel Franco with Next.js, FastAPI and LangChain.</footer>
      </section>
    </div>
  );
}
