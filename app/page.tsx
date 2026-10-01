import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { DEMOS } from "./demos";
import { PromptLauncher } from "./_components/PromptLauncher";

const REPO = "https://github.com/francotechadmin/ai-sandbox";
const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <section className="bg-ultra text-white">
        <div className="mx-auto flex min-h-[34rem] w-full max-w-[1200px] flex-col px-5 pb-14 pt-6 sm:min-h-[40rem] sm:px-10 sm:pb-20">
          <header className="flex items-center justify-between text-[15px] font-medium">
            <span className="font-display text-lg font-bold tracking-tight">AI Sandbox</span>
            <a
              href={REPO}
              className="underline decoration-white/40 underline-offset-4 hover:decoration-white focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sun"
            >
              GitHub
            </a>
          </header>

          <div className="mt-auto pt-20">
            <h1
              className="rise font-display text-[clamp(3.25rem,10.5vw,9.5rem)] font-extrabold leading-[0.92] tracking-[-0.035em]"
              style={delay(0)}
            >
              AI agents
              <br />
              you can watch
              <br />
              work.
            </h1>
            <p className="rise mt-7 max-w-[32rem] text-lg leading-snug text-white/85 sm:text-xl" style={delay(0.15)}>
              A sandbox of working builds. Choose the model, rewrite the prompt, switch tools on and off, and see the
              reasoning as it happens.
            </p>
            <div className="rise mt-9 max-w-[46rem]" style={delay(0.3)}>
              <PromptLauncher />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 pb-10 pt-16 sm:px-10 sm:pt-24" aria-labelledby="demos-heading">
        <h2 id="demos-heading" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Demos
        </h2>
        <ul className="mt-8 border-t-2 border-ink">
          {DEMOS.map((demo) => (
            <li key={demo.slug} className="border-b border-ink/15">
              <Link
                href={`/${demo.slug}`}
                className="group -mx-3 flex items-start gap-6 rounded-lg px-3 py-7 transition-colors hover:bg-ultra hover:text-white focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-ultra sm:-mx-4 sm:px-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-3xl font-bold tracking-tight sm:text-5xl">{demo.name}</span>
                  <span className="mt-3 block max-w-[38rem] text-base leading-relaxed text-ink/70 group-hover:text-white/85">
                    {demo.description}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
                    <span
                      className={`size-2 rounded-full ${demo.status === "live" ? "bg-green" : "bg-sun ring-1 ring-ink/30 group-hover:ring-0"}`}
                      aria-hidden
                    />
                    {demo.status === "live" ? "Live" : "In progress"}
                  </span>
                </span>
                <ArrowUpRightIcon className="mt-2 size-8 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 sm:size-12" strokeWidth={1.75} />
              </Link>
            </li>
          ))}
        </ul>
        <footer className="mt-16 text-sm text-ink/60">Built by Gabriel Franco with Next.js, FastAPI and LangChain.</footer>
      </section>
    </div>
  );
}
