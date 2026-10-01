"use client";

// Markdown for assistant text. Elements are styled by Tailwind Typography
// (`prose`, themed in globals.css); only code blocks, tables and links need
// components of their own.

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import clsx from "clsx";
import { CheckIcon, CopyIcon } from "lucide-react";
import { type FC, memo, useState } from "react";
import remarkGfm from "remark-gfm";

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!code || copied) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="mt-3 flex items-center justify-between rounded-t-xl border border-b-0 border-line bg-panel2 px-3.5 py-1.5 text-xs">
      <span className="font-medium lowercase text-muted">{language}</span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="rounded-md p-1 text-muted transition-colors hover:bg-line hover:text-text [&_svg]:size-3.5"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
};

const components = memoizeMarkdownComponents({
  a: (props) => <a target="_blank" rel="noreferrer" {...props} />,
  table: (props) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={clsx("mt-0 overflow-x-auto rounded-t-none rounded-b-xl border border-t-0 border-line bg-bg", className)}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={clsx(
          !isBlock && "rounded-md bg-panel2 px-1.5 py-0.5 text-[0.85em] before:content-none after:content-none",
          className,
        )}
        {...props}
      />
    );
  },
  CodeHeader,
});

export const Markdown = memo(function Markdown() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md prose chat-prose max-w-none"
      components={components}
      defer
    />
  );
});
