"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoSwitcher } from "../_components/DemoSwitcher";
import { Chat } from "./components/Chat";
import { SettingsPanel } from "./components/SettingsPanel";
import { cachedConfig, fetchConfig } from "./lib/config";
import { initialSettings, saveSettings } from "./lib/settings";
import type { AssistantConfig, Settings } from "./lib/types";

// Mirrors an empty chat (welcome line, composer, suggestions) while the config loads.
function ChatSkeleton() {
  return (
    <div role="status" className="mx-auto flex h-full w-full max-w-[44rem] flex-col justify-center gap-6 px-4">
      <span className="sr-only">Loading assistant</span>
      <Skeleton className="h-7 w-2/5 motion-reduce:animate-none" />
      <Skeleton className="h-24 w-full rounded-2xl motion-reduce:animate-none" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full rounded-xl motion-reduce:animate-none" />
        <Skeleton className="h-10 w-full rounded-xl motion-reduce:animate-none" />
        <Skeleton className="h-10 w-full rounded-xl motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const agent = new URLSearchParams(window.location.search).get("agent");
    // Render from the cached copy right away, then refresh it from the server.
    let cached: AssistantConfig | null = null;
    const show = (c: AssistantConfig) => {
      setConfig(c);
      setSettings(initialSettings(c));
    };
    queueMicrotask(() => {
      cached = cachedConfig(agent);
      if (cached) show(cached);
    });
    fetchConfig(agent)
      .then((c) => {
        if (cached && JSON.stringify(c) === JSON.stringify(cached)) return;
        show(c);
      })
      .catch((e: Error) => {
        if (!cached) setLoadError(`Couldn't reach the assistant API (${e.message}). Is the backend running?`);
      });
  }, []);

  function update(next: Settings) {
    setSettings(next);
    if (config) saveSettings(config.agent, next);
  }

  function newChat() {
    setChatKey((k) => k + 1);
    setShowSettings(false);
  }

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
          <DemoSwitcher slug="assistant" label={config?.name} />
        </div>

        {config && settings && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={newChat}
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.04]"
              aria-label="New chat"
            >
              <PlusIcon className="size-3.5" />
              New
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.04]"
              data-testid="open-settings"
            >
              Settings
            </button>
          </div>
        )}
      </header>

      {loadError ? (
        <div className="m-6 rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-sm text-red" data-testid="load-error">
          {loadError}
        </div>
      ) : !config || !settings ? (
        <main className="relative isolate min-h-0 flex-1 overflow-hidden" aria-busy>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-cover bg-center opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]"
            style={{ backgroundImage: "url(/hero-flow.svg)" }}
            aria-hidden
          />
          <ChatSkeleton />
        </main>
      ) : (
        <>
          <main className="relative isolate min-h-0 flex-1 overflow-hidden">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-cover bg-center opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]"
              style={{ backgroundImage: "url(/hero-flow.svg)" }}
              aria-hidden
            />
            <Chat key={chatKey} settings={settings} config={config} onNewChat={newChat} />
          </main>

          <SettingsPanel
            config={config}
            settings={settings}
            onChange={update}
            onNewChat={newChat}
            onClose={() => setShowSettings(false)}
            isOpen={showSettings}
          />
        </>
      )}
    </div>
  );
}
