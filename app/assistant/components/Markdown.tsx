"use client";

// Markdown for assistant text, adapted from assistant-ui's own markdown-text
// component (MIT) and themed with this sandbox's tokens.

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { type FC, memo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

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
  h1: ({ className, ...p }) => <h1 className={cx("mt-5 mb-2 text-xl font-semibold first:mt-0 last:mb-0", className)} {...p} />,
  h2: ({ className, ...p }) => <h2 className={cx("mt-5 mb-2 text-lg font-semibold first:mt-0 last:mb-0", className)} {...p} />,
  h3: ({ className, ...p }) => <h3 className={cx("mt-4 mb-1.5 text-base font-semibold first:mt-0 last:mb-0", className)} {...p} />,
  h4: ({ className, ...p }) => <h4 className={cx("mt-3.5 mb-1 text-base font-medium first:mt-0 last:mb-0", className)} {...p} />,
  h5: ({ className, ...p }) => <h5 className={cx("mt-3 mb-1 text-sm font-semibold first:mt-0 last:mb-0", className)} {...p} />,
  h6: ({ className, ...p }) => <h6 className={cx("mt-3 mb-1 text-sm font-medium first:mt-0 last:mb-0", className)} {...p} />,
  p: ({ className, ...p }) => <p className={cx("my-3 leading-relaxed first:mt-0 last:mb-0", className)} {...p} />,
  a: ({ className, ...p }) => <a className={cx("text-amber underline underline-offset-2 hover:opacity-80", className)} target="_blank" rel="noreferrer" {...p} />,
  blockquote: ({ className, ...p }) => <blockquote className={cx("my-3 border-s-2 border-line ps-4 text-muted", className)} {...p} />,
  ul: ({ className, ...p }) => <ul className={cx("my-3 ms-5 list-disc marker:text-muted [&>li]:mt-1", className)} {...p} />,
  ol: ({ className, ...p }) => <ol className={cx("my-3 ms-5 list-decimal marker:text-muted [&>li]:mt-1", className)} {...p} />,
  hr: ({ className, ...p }) => <hr className={cx("my-3 border-line", className)} {...p} />,
  table: ({ className, ...p }) => (
    <div className="my-3 overflow-x-auto">
      <table className={cx("w-full border-separate border-spacing-0 text-[13px]", className)} {...p} />
    </div>
  ),
  th: ({ className, ...p }) => <th className={cx("bg-panel2 px-3 py-1.5 text-start font-medium first:rounded-ss-lg last:rounded-se-lg", className)} {...p} />,
  td: ({ className, ...p }) => <td className={cx("border-b border-s border-line px-3 py-1.5 text-start last:border-e", className)} {...p} />,
  tr: ({ className, ...p }) => <tr className={cx("m-0 p-0 [&:last-child>td:first-child]:rounded-es-lg [&:last-child>td:last-child]:rounded-ee-lg", className)} {...p} />,
  li: ({ className, ...p }) => <li className={cx("leading-relaxed", className)} {...p} />,
  strong: ({ className, ...p }) => <strong className={cx("font-semibold", className)} {...p} />,
  pre: ({ className, ...p }) => (
    <pre className={cx("overflow-x-auto rounded-b-xl border border-t-0 border-line bg-bg p-3.5 text-[13px] leading-relaxed", className)} {...p} />
  ),
  code: function Code({ className, ...p }) {
    const isBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cx(!isBlock && "rounded-md bg-panel2 px-1.5 py-0.5 font-mono text-[0.85em]", className)}
        {...p}
      />
    );
  },
  CodeHeader,
});

function MarkdownImpl() {
  return <MarkdownTextPrimitive remarkPlugins={[remarkGfm]} className="aui-md" components={components} defer />;
}

export const Markdown = memo(MarkdownImpl);
