"use client";

import { useEffect, useState } from "react";
import { InfoIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DEMOS } from "../demos";

const key = (slug: string) => `demo-intro-seen-v1:${slug}`;

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
        className="flex size-8 items-center justify-center rounded-full border border-white/15 text-text/70 transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-text"
      >
        <InfoIcon className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="demo-intro" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{intro.title ?? demo.name}</DialogTitle>
            <DialogDescription className="flex flex-col gap-2">
              {intro.body.map((p) => (
                <span key={p}>{p}</span>
              ))}
            </DialogDescription>
          </DialogHeader>
          {intro.tips && (
            <ul className="text-muted-foreground flex list-disc flex-col gap-1.5 pl-5 text-sm">
              {intro.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
