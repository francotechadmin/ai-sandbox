"use client";

import { useEffect, useMemo, useState } from "react";
import { DatabaseIcon, ListIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { HeaderButton } from "@/app/_components/HeaderButton";
import { AgentPageShell } from "@/app/assistant/components/AgentPageShell";
import { SettingsPanel } from "@/app/assistant/components/SettingsPanel";
import { fetchConfig } from "@/app/assistant/lib/config";
import { initialSettings, saveSettings } from "@/app/assistant/lib/settings";
import type { AssistantConfig, Settings } from "@/app/assistant/lib/types";
import { BreakCard } from "./components/BreakCard";
import { BreakPicker } from "./components/BreakPicker";
import { SourcesPanel } from "./components/SourcesPanel";
import { TriageChat } from "./components/TriageChat";
import { forBreak } from "./lib/prompts";
import type { TradeBreak } from "./lib/types";

const AGENT = "triage";

export default function TriagePage() {
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [breaks, setBreaks] = useState<TradeBreak[]>([]);
  const [breakId, setBreakId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [panel, setPanel] = useState<"breaks" | "sources" | "settings" | null>(null);

  useEffect(() => {
    Promise.all([
      fetchConfig(AGENT),
      fetch("/api/triage/breaks").then((r) => (r.ok ? (r.json() as Promise<TradeBreak[]>) : Promise.reject(new Error(`HTTP ${r.status}`)))),
    ])
      .then(([c, b]) => {
        setConfig(c);
        setSettings(initialSettings(c));
        setBreaks(b);
        setBreakId((id) => id ?? b[0]?.id ?? null);
      })
      .catch((e: Error) => setLoadError(`Couldn't reach the API (${e.message}). Is the backend running?`));
  }, []);

  const current = breaks.find((b) => b.id === breakId) ?? null;
  const prompts = useMemo(() => (config && current ? forBreak(config.prompts, current.id) : []), [config, current]);

  function update(next: Settings) {
    setSettings(next);
    if (config) saveSettings(config.agent, next);
  }

  function restart(id?: string) {
    if (id) setBreakId(id);
    setChatKey((k) => k + 1);
    setPanel(null);
  }

  return (
    <AgentPageShell
      slug="triage"
      name={config?.name}
      loadError={loadError}
      isReady={!!(config && settings && current)}
      headerActions={
        <>
          <HeaderButton icon={PlusIcon} label="New" aria-label="Restart investigation" onClick={() => restart()} />
          <HeaderButton icon={ListIcon} label="Breaks" data-testid="open-breaks" onClick={() => setPanel("breaks")} />
          <HeaderButton icon={DatabaseIcon} label="Sources" onClick={() => setPanel("sources")} />
          <HeaderButton icon={SettingsIcon} label="Settings" onClick={() => setPanel("settings")} />
        </>
      }
      panels={
        config && settings && current ? (
          <>
            <BreakPicker
              breaks={breaks}
              currentId={current.id}
              isOpen={panel === "breaks"}
              onSelect={restart}
              onClose={() => setPanel(null)}
            />
            <SourcesPanel isOpen={panel === "sources"} onClose={() => setPanel(null)} />
            <SettingsPanel
              config={config}
              settings={settings}
              onChange={update}
              onNewChat={() => restart()}
              onClose={() => setPanel(null)}
              isOpen={panel === "settings"}
            />
          </>
        ) : null
      }
    >
      {config && settings && current && (
        <div className="absolute inset-0 flex flex-col">
          <BreakCard brk={current} />
          <div className="flex min-h-0 flex-1 flex-col [&>*]:h-auto [&>*]:min-h-0 [&>*]:flex-1">
            <TriageChat key={`${current.id}:${chatKey}`} settings={settings} config={config} prompts={prompts} onNewChat={() => setPanel("breaks")} />
          </div>
        </div>
      )}
    </AgentPageShell>
  );
}
