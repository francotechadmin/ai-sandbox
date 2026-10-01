"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Chat } from "./components/Chat";
import { SettingsPanel } from "./components/SettingsPanel";
import { initialSettings, saveSettings } from "./lib/settings";
import type { AssistantConfig, Settings } from "./lib/types";

export default function AssistantPage() {
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0); // bump to start a fresh thread
  const [showSettings, setShowSettings] = useState(false); // phone only; always visible on large screens

  useEffect(() => {
    fetch("/api/assistant/config")
      .then((r) => (r.ok ? (r.json() as Promise<AssistantConfig>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((c) => {
        setConfig(c);
        setSettings(initialSettings(c));
      })
      .catch((e: Error) => setLoadError(`Couldn’t reach the assistant API (${e.message}). Is the backend running?`));
  }, []);

  function update(next: Settings) {
    setSettings(next);
    saveSettings(next);
  }

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4 sm:px-6">
        <div className="flex items-center gap-3 text-[15px]">
          <Link href="/" className="font-medium tracking-tight text-text/70 transition-colors hover:text-text">
            AI Sandbox
          </Link>
          <span className="text-line" aria-hidden>/</span>
          <span className="font-medium tracking-tight">Assistant</span>
        </div>
        {config && settings && (
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="rounded-full border border-white/15 px-3.5 py-1 text-[13px] font-medium transition-colors hover:border-white/30 lg:hidden"
            data-testid="open-settings"
          >
            Settings
          </button>
        )}
      </header>

      {loadError ? (
        <div className="m-6 rounded-lg border border-danger-line bg-danger-bg px-4 py-3 text-sm text-red" data-testid="load-error">
          {loadError}
        </div>
      ) : !config || !settings ? (
        <div className="m-6 text-sm text-muted">Loading…</div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_340px]">
          <main className="relative isolate min-h-0 overflow-hidden">
            {/* Faint flow pattern behind the thread, fading out downward. */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-cover bg-center opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]"
              style={{ backgroundImage: "url(/hero-flow.svg)" }}
              aria-hidden
            />
            <Chat key={chatKey} settings={settings} />
          </main>
          <SettingsPanel
            config={config}
            settings={settings}
            onChange={update}
            onNewChat={() => {
              setChatKey((k) => k + 1);
              setShowSettings(false);
            }}
            onClose={() => setShowSettings(false)}
            className={showSettings ? "fixed inset-0 top-14 z-20 flex" : "hidden lg:flex"}
          />
        </div>
      )}
    </div>
  );
}
