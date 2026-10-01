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
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between h-14 shrink-0 border-b border-line bg-bg/95 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="text-xs text-muted hover:text-text">← Sandbox</Link>
          <span className="text-sm font-semibold">Assistant</span>
        </div>
        {config && settings && (
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="rounded-lg border border-line px-3 py-1 text-[13px] font-medium hover:border-[#3a4451] lg:hidden"
            data-testid="open-settings"
          >
            Settings
          </button>
        )}
      </header>

      {loadError ? (
        <div className="m-6 rounded-lg border border-[#4a2a26] bg-[#301c1a] px-4 py-3 text-sm text-red" data-testid="load-error">
          {loadError}
        </div>
      ) : !config || !settings ? (
        <div className="m-6 text-sm text-muted">Loading…</div>
      ) : (
        <div className="mx-auto grid min-h-0 w-full max-w-[1280px] flex-1 grid-cols-1 gap-5 px-2 py-2 sm:px-6 sm:py-5 lg:grid-cols-[1fr_320px]">
          <main className="min-h-0 overflow-hidden rounded-xl border border-line bg-panel">
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
            className={showSettings ? "fixed inset-0 top-14 z-20 flex rounded-none border-0" : "hidden lg:flex"}
          />
        </div>
      )}
    </div>
  );
}
