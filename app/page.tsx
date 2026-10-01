import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { DEMOS } from "./demos";
import { PromptLauncher } from "./_components/PromptLauncher";

const REPO = "https://github.com/francotechadmin/ai-sandbox";
const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

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
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(6,7,12,0.88)_0%,rgba(6,7,12,0.45)_55%,rgba(6,7,12,0.1)_100%),linear-gradient(0deg,#06070c_0%,transparent_38%)]"
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
              className="rise font-display text-[clamp(3.5rem,9.5vw,8.25rem)] font-normal leading-[0.94] tracking-[-0.02em]"
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
        <h2 id="demos-heading" className="font-display text-4xl tracking-tight sm:text-5xl">
          Demos
        </h2>
        <ul className="mt-8 border-t border-white/15">
          {DEMOS.map((demo) => (
            <li key={demo.slug} className="border-b border-white/10">
              <Link
                href={`/${demo.slug}`}
                className="group -mx-3 flex items-start gap-6 rounded-lg px-3 py-8 transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bone sm:-mx-4 sm:px-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-4xl tracking-tight sm:text-6xl">{demo.name}</span>
                  <span className="mt-3 block max-w-[38rem] text-base leading-relaxed text-bone/65">
                    {demo.description}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm text-bone/80">
                    <span
                      className={`size-2 rounded-full ${demo.status === "live" ? "bg-green shadow-[0_0_10px_var(--color-green)]" : "bg-amber shadow-[0_0_10px_var(--color-amber)]"}`}
                      aria-hidden
                    />
                    {demo.status === "live" ? "Live" : "In progress"}
                  </span>
                </span>
                <ArrowUpRightIcon
                  className="mt-3 size-8 shrink-0 text-bone/50 transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-bone sm:size-11"
                  strokeWidth={1.25}
                />
              </Link>
            </li>
          ))}
        </ul>
        <footer className="mt-16 text-sm text-bone/45">Built by Gabriel Franco with Next.js, FastAPI and LangChain.</footer>
      </section>
    </div>
  );
}
