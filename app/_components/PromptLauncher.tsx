"use client";

import Link from "next/link";
import { ArrowUpIcon } from "lucide-react";
import { TypeAnimation } from "react-type-animation";
import { prompts } from "../../api/assistant/config/prompts.json";

// Looks like the assistant's composer and is a link to it. It only types out
// the assistant's prompts (api/assistant/config/prompts.json); nothing typed here is sent anywhere.
const SEQUENCE = prompts.flatMap(({ prompt }) => [prompt, 2200]);

export function PromptLauncher() {
  return (
    <Link
      href="/assistant"
      aria-label="Open the assistant"
      className="group flex min-h-16 items-center gap-4 rounded-full border border-white/15 bg-white/[0.06] py-2.5 pe-2.5 ps-6 text-bone backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone sm:min-h-[4.5rem] sm:ps-8"
    >
      <span className="min-w-0 flex-1 truncate text-[17px] sm:text-[19px]" aria-hidden>
        <TypeAnimation
          sequence={SEQUENCE}
          preRenderFirstString
          repeat={Infinity}
          cursor={false}
          speed={{ type: "keyStrokeDelayInMs", value: 38 }}
          deletionSpeed={{ type: "keyStrokeDelayInMs", value: 16 }}
        />
        <span className="caret ms-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.2em] bg-bone" />
      </span>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bone text-void transition-transform group-hover:scale-105 sm:size-[3.25rem]">
        <ArrowUpIcon className="size-5 sm:size-6" strokeWidth={2.25} />
      </span>
    </Link>
  );
}
