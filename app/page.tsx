import Link from "next/link";
import { BrainIcon, CheckIcon, WrenchIcon } from "lucide-react";
import { DEMOS } from "./demos";

const REPO = "https://github.com/francotechadmin/ai-sandbox";

// An example run, drawn with the same pieces the assistant page uses. It is a
// fixed illustration, not a live call.
function ExampleTrace() {
  return (
    <figure className="rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-label="Example assistant run">
      <div className="flex flex-col gap-3 text-[14px] leading-relaxed">
        <div className="trace-step flex justify-end" style={{ "--i": 0 } as React.CSSProperties}>
          <p className="max-w-[85%] rounded-2xl bg-panel2 px-4 py-2">What is 1234 * 5678?</p>
        </div>

        <div className="trace-step rounded-xl border border-line bg-bg/40" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="flex items-center gap-2 px-3 py-2 text-[13px] text-muted">
            <BrainIcon className="size-3.5" />
            <span className="font-medium">Reasoning</span>
          </div>
          <p className="border-t border-line px-3 py-2.5 text-[13px] text-muted">
            A large multiplication. Better to calculate it than to guess.
          </p>
        </div>

        <div className="trace-step overflow-hidden rounded-xl border border-line bg-bg/40" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="flex items-center gap-2 px-3 py-2 text-[13px]">
            <WrenchIcon className="size-3.5 text-muted" />
            <span className="font-mono text-[12px] text-[#7db3d8]">calculator</span>
            <span className="ms-auto flex items-center gap-1.5 text-muted">
              <CheckIcon className="size-3.5 text-green" />
              Done
            </span>
          </div>
          <div className="border-t border-line px-3 py-2 font-mono text-[12px] text-muted">
            {`{"expression":"1234 * 5678"}`}
          </div>
          <div className="border-t border-line px-3 py-2 font-mono text-[12px]">7006652</div>
        </div>

        <p className="trace-step px-1" style={{ "--i": 3 } as React.CSSProperties}>
          1234 × 5678 = <strong className="font-semibold">7,006,652</strong>.
        </p>
      </div>
      <figcaption className="mt-4 border-t border-line pt-3 text-[13px] text-muted">
        Example run. The assistant page does this live, with the model, prompt and tools you choose.
      </figcaption>
    </figure>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[1080px] px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div>
          <h1 className="font-serif text-[2.5rem] font-semibold leading-[1.08] tracking-tight sm:text-[3.5rem]">
            Watch an AI agent
            <br />
            do its work.
          </h1>
          <p className="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-[#c6cbd3]">
            Working builds, not mockups. Pick the model, rewrite the system prompt and switch tools on and off,
            then see the reasoning, the tool calls and the answer as they happen.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/assistant"
              className="rounded-lg bg-amber px-5 py-2.5 text-[15px] font-semibold text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            >
              Open the assistant
            </Link>
            <a
              href={REPO}
              className="text-[15px] text-muted underline underline-offset-4 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            >
              Read the code on GitHub
            </a>
          </div>
        </div>
        <ExampleTrace />
      </section>

      <section className="mt-20 sm:mt-28" aria-labelledby="demos-heading">
        <h2 id="demos-heading" className="font-serif text-2xl font-semibold tracking-tight">
          Demos
        </h2>
        <ul className="mt-5 border-t border-line">
          {DEMOS.map((demo) => (
            <li key={demo.slug} className="border-b border-line">
              <Link
                href={`/${demo.slug}`}
                className="group grid gap-x-8 gap-y-1.5 py-6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber sm:grid-cols-[14rem_1fr_auto] sm:items-baseline"
              >
                <span className="text-lg font-semibold group-hover:text-amber">{demo.name}</span>
                <span className="max-w-[40rem] text-[15px] leading-relaxed text-[#c6cbd3]">{demo.description}</span>
                <span
                  className={`flex items-center gap-2 text-[13px] ${demo.status === "live" ? "text-green" : "text-amber"}`}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  {demo.status === "live" ? "Live" : "In progress"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 text-[13px] text-muted">Built by Gabriel Franco. Next.js, FastAPI and LangChain.</footer>
    </main>
  );
}
