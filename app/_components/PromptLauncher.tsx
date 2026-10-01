"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpIcon } from "lucide-react";

// Looks like the assistant's composer and is a link to it. It only cycles
// through example questions; nothing typed here is sent anywhere.
const PROMPTS = [
  "What's the weather in Houston right now?",
  "Walk me through a plan to migrate a Postgres database.",
  "Explain this error and how to fix it.",
  "Draft a runbook for a pump failure alarm.",
];

export function PromptLauncher() {
  const [text, setText] = useState(PROMPTS[0]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let prompt = 0;
    // Starts on the full first prompt (what the server rendered), erases it,
    // then types the rest in turn.
    let chars = (PROMPTS[0] ?? "").length;
    let deleting = true;

    const tick = () => {
      if (!alive) return;
      const full = PROMPTS[prompt] ?? "";
      if (!deleting) {
        chars += 1;
        setText(full.slice(0, chars));
        if (chars === full.length) {
          deleting = true;
          timer = setTimeout(tick, 2200);
          return;
        }
        timer = setTimeout(tick, 38);
      } else {
        chars -= 1;
        setText(full.slice(0, chars));
        if (chars === 0) {
          deleting = false;
          prompt = (prompt + 1) % PROMPTS.length;
          timer = setTimeout(tick, 350);
          return;
        }
        timer = setTimeout(tick, 16);
      }
    };

    timer = setTimeout(tick, 1800);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <Link
      href="/assistant"
      aria-label="Open the assistant"
      className="group flex min-h-16 items-center gap-4 rounded-full bg-white py-2.5 pe-2.5 ps-6 text-ink shadow-[0_18px_50px_-12px_rgba(8,10,60,0.55)] transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sun sm:min-h-[4.5rem] sm:ps-8"
    >
      <span className="min-w-0 flex-1 truncate text-[17px] sm:text-[20px]" aria-hidden>
        {text}
        <span className="caret ms-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.2em] bg-ink" />
      </span>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sun transition-transform group-hover:scale-105 sm:size-[3.25rem]">
        <ArrowUpIcon className="size-5 sm:size-6" strokeWidth={2.5} />
      </span>
    </Link>
  );
}
