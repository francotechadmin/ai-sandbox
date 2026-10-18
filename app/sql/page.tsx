"use client";

import { useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { SqlChat } from "./components/SqlChat";
import { DatabasePanel } from "./components/DatabasePanel";
import { AgentPageShell } from "@/app/assistant/components/AgentPageShell";
import { SettingsPanel } from "@/app/assistant/components/SettingsPanel";
import { initialSettings, saveSettings } from "@/app/assistant/lib/settings";
import type { AssistantConfig, Settings } from "@/app/assistant/lib/types";

export default function SqlPage() {
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [showDatabase, setShowDatabase] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetch("/api/assistant/config?agent=sql")
      .then((r) => (r.ok ? (r.json() as Promise<AssistantConfig>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((c) => {
        setConfig(c);
        setSettings(initialSettings(c));
      })
      .catch((e: Error) =>
        setLoadError(`Couldn't reach the API (${e.message}). Is the backend running?`),
      );
  }, []);

  function update(next: Settings) {
    setSettings(next);
    if (config) saveSettings(config.agent, next);
  }

  function newChat() {
    setChatKey((k) => k + 1);
    setShowDatabase(false);
    setShowSettings(false);
  }

  return (
    <AgentPageShell
      slug="sql"
      name={config?.name}
      loadError={loadError}
      isReady={!!(config && settings)}
      headerActions={
        <>
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
            onClick={() => setShowDatabase(true)}
            className="rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.04]"
          >
            Database
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="rounded-full border border-white/15 px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.04]"
          >
            Settings
          </button>
        </>
      }
      panels={
        config && settings ? (
          <>
            <DatabasePanel isOpen={showDatabase} onClose={() => setShowDatabase(false)} />
            <SettingsPanel
              config={config}
              settings={settings}
              onChange={update}
              onNewChat={newChat}
              onClose={() => setShowSettings(false)}
              isOpen={showSettings}
            />
          </>
        ) : null
      }
    >
      {config && settings && (
        <SqlChat key={chatKey} settings={settings} config={config} onNewChat={newChat} />
      )}
    </AgentPageShell>
  );
}
