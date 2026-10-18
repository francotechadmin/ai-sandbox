import Link from "next/link";
import { ArrowUpRightIcon, BrainIcon, CheckIcon, WrenchIcon } from "lucide-react";
import { DEMOS } from "./demos";

// Dark-interior chat UI preview — contrasts nicely against the light card.
function DemoPreview() {
  return (
    <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-t-3xl bg-[#0d0d10] sm:h-64">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(70,100,180,0.12),transparent_60%)]" aria-hidden />
      <div className="relative flex w-[78%] max-w-sm flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-transform duration-500 group-hover:-translate-y-1.5">
        <div className="ms-auto h-7 w-3/5 rounded-full bg-white/10" />
        <div className="flex items-center gap-2 rounded-lg border border-white/8 px-2.5 py-1.5 text-xs text-white/45">
          <BrainIcon className="size-3.5 shrink-0" />
          Reasoning
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/8 px-2.5 py-1.5 text-xs text-white/45">
          <WrenchIcon className="size-3.5 shrink-0" />
          <span className="font-mono text-[#7db3d8]">query_equipment_data</span>
          <CheckIcon className="ms-auto size-3.5 shrink-0 text-[#4fae76]" />
        </div>
        <div className="h-2 w-full rounded-full bg-white/10" />
        <div className="h-2 w-4/5 rounded-full bg-white/10" />
        <div className="h-2 w-2/5 rounded-full bg-white/6" />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper text-ink">

      {/* Sticky header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line-light bg-paper/90 px-5 py-3.5 backdrop-blur-sm sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold tracking-wide text-paper">
            GF
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[14px] font-semibold tracking-tight">Gabriel Franco</span>
            <span className="mt-0.5 text-[11px] text-ink-muted">AI &amp; Full-Stack Engineer</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[13px] text-green sm:flex">
            <span className="size-1.5 rounded-full bg-green shadow-[0_0_6px_var(--color-green)]" aria-hidden />
            Open to projects
          </span>
          <a
            href="https://francotech.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          >
            Get in touch
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-10 sm:py-14">

        {/* Section label */}
        <div className="mb-8 sm:mb-10">
          <p className="mb-3 text-[13px] font-medium uppercase tracking-widest text-ink/35">
            Portfolio
          </p>
          <h1 className="font-display text-[2.25rem] font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">
            What I actually build.
          </h1>
          <p className="mt-3 max-w-lg text-[17px] leading-relaxed text-ink-muted">
            Every demo below is a working system — open one, run the agent, watch tool calls happen live.
          </p>
        </div>

        {/* Demo grid */}
        <ul className="grid gap-5 md:grid-cols-2">
          {DEMOS.map((demo) => (
            <li key={demo.slug}>
              <Link
                href={`/${demo.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line-light bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                <DemoPreview />
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                      {demo.name}
                    </h2>
                    <ArrowUpRightIcon
                      className="mt-1 size-5 shrink-0 text-ink/25 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                      strokeWidth={1.75}
                    />
                  </div>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">
                    {demo.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm text-ink/55">
                    <span
                      className={`size-2 rounded-full ${
                        demo.status === "live"
                          ? "bg-green shadow-[0_0_8px_var(--color-green)]"
                          : "bg-amber shadow-[0_0_8px_var(--color-amber)]"
                      }`}
                      aria-hidden
                    />
                    {demo.status === "live" ? "Live" : "In progress"}
                  </span>
                </div>
              </Link>
            </li>
          ))}

          {/* Placeholder */}
          <li className="hidden md:block">
            <div className="flex h-full min-h-72 flex-col items-start justify-end rounded-3xl border border-dashed border-ink/12 p-7">
              <h3 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink/30 sm:text-3xl">
                More soon
              </h3>
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-ink/25">
                Each new demo ships as a working build.
              </p>
            </div>
          </li>
        </ul>
      </main>

      <footer className="mx-auto max-w-[1200px] px-5 pb-10 sm:px-10">
        <p className="text-sm text-ink/30">
          Built by Gabriel Franco · Next.js, FastAPI, LangChain
        </p>
      </footer>
    </div>
  );
}
