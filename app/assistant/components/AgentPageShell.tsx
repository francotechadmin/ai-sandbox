"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { DemoIntro } from "@/app/_components/DemoIntro";
import { DemoSwitcher } from "@/app/_components/DemoSwitcher";

export function AgentPageShell({
  slug,
  name,
  headerActions,
  children,
  loadingSkeleton,
  panels,
  loadError,
  isReady,
}: {
  slug: string;
  name?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  loadingSkeleton?: ReactNode;
  panels?: ReactNode;
  loadError?: string | null;
  isReady: boolean;
}) {
  return (
    <div className="aui-app flex h-dvh flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-75">
            <div className="flex size-7 items-center justify-center rounded-full bg-text text-[10px] font-semibold tracking-wide text-bg">
              GF
            </div>
            <span className="hidden text-[14px] font-medium tracking-tight text-text/70 sm:block">
              Gabriel Franco
            </span>
          </Link>
          <span className="text-[18px] font-light text-line" aria-hidden>/</span>
          <DemoSwitcher slug={slug} label={name} />
        </div>
        <div className="flex items-center gap-2">
          {isReady && headerActions}
          <DemoIntro slug={slug} />
        </div>
      </header>

      {loadError ? (
        <div
          className="m-6 rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-sm text-red"
          data-testid="load-error"
        >
          {loadError}
        </div>
      ) : (
        <>
          <main className="relative isolate min-h-0 flex-1 overflow-hidden" aria-busy={!isReady}>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-cover bg-center opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]"
              style={{ backgroundImage: "url(/hero-flow.svg)" }}
              aria-hidden
            />
            {isReady ? children : (loadingSkeleton ?? <div className="m-6 text-sm text-muted-foreground">Loading…</div>)}
          </main>
          {isReady && panels}
        </>
      )}
    </div>
  );
}
