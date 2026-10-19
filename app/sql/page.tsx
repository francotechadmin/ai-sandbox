"use client";

import { useEffect, useState } from "react";
import { DatabaseIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { HeaderButton } from "@/app/_components/HeaderButton";
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
          <HeaderButton icon={PlusIcon} label="New" aria-label="New chat" onClick={newChat} />
          <HeaderButton icon={DatabaseIcon} label="Database" onClick={() => setShowDatabase(true)} />
          <HeaderButton icon={SettingsIcon} label="Settings" onClick={() => setShowSettings(true)} />
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
