"use client";

import { useEffect, useState, type ComponentType } from "react";
import { BrainIcon, ChartLineIcon, CodeIcon, DatabaseIcon, InfoIcon, SlidersHorizontalIcon, WrenchIcon } from "lucide-react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { DEMOS, type DemoIntroIcon } from "../demos";

const key = (slug: string) => `demo-intro-seen-v1:${slug}`;

const ICONS: Record<DemoIntroIcon, ComponentType<{ className?: string }>> = {
  brain: BrainIcon,
  wrench: WrenchIcon,
  sliders: SlidersHorizontalIcon,
  database: DatabaseIcon,
  code: CodeIcon,
  chart: ChartLineIcon,
};

// The demo's intro pop-up (configured in demos.ts): opens by itself the first
// time a demo is visited, and any time from the info button in the header.
// Renders nothing for a demo without an `intro`.
export function DemoIntro({ slug }: { slug: string }) {
  const demo = DEMOS.find((d) => d.slug === slug);
  const intro = demo?.intro;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!intro) return;
    // Read storage after hydration, off the effect's synchronous path.
    queueMicrotask(() => {
      try {
        if (!window.localStorage.getItem(key(slug))) setOpen(true);
      } catch {
        /* storage unavailable — skip the auto-open, the button still works */
      }
    });
  }, [slug, intro]);

  if (!demo || !intro) return null;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      try {
        window.localStorage.setItem(key(slug), "1");
      } catch {
        /* storage unavailable — it will show again next visit */
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`About ${demo.name}`}
        data-testid="demo-intro-open"
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-text/70 transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-text"
      >
        <InfoIcon className="size-4" />
      </button>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent data-testid="demo-intro" className="sm:max-w-lg">
          <div className="relative isolate overflow-hidden border-b border-line px-6 pt-7 pb-6">
            <div
              className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]"
              style={{ backgroundImage: "url(/hero-flow.svg)" }}
              aria-hidden
            />
            <p className="mb-2 text-[11px] font-medium tracking-[0.18em] text-text/45 uppercase">Demo</p>
            <ResponsiveDialogTitle className="font-display text-[1.65rem] leading-tight font-semibold tracking-[-0.02em]">
              {intro.title ?? demo.name}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="mt-2 text-[15px] text-text/70">{intro.tagline}</ResponsiveDialogDescription>
          </div>

          <div className="flex flex-col gap-5 px-6 py-5">
            <ul className="flex flex-col gap-4">
              {intro.highlights.map(({ icon, title, text }) => {
                const Icon = ICONS[icon];
                return (
                  <li key={title} className="flex gap-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#7db3d8]">
                      <Icon className="size-[18px]" />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-medium text-text">{title}</span>
                      <span className="text-[13px] leading-relaxed text-text/60">{text}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {intro.howTo && (
              <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-text/70">
                <span className="font-medium text-text">How to use it. </span>
                {intro.howTo}
              </p>
            )}

            {intro.stack && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Built with">
                {intro.stack.map((t) => (
                  <li key={t} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-text/55">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-line bg-panel sticky bottom-0 flex justify-end border-t px-6 py-4">
            <Button onClick={() => onOpenChange(false)}>Start exploring</Button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
