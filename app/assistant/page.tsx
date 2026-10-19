"use client";

import { useEffect, useState } from "react";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { HeaderButton } from "@/app/_components/HeaderButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Chat } from "./components/Chat";
import { SettingsPanel } from "./components/SettingsPanel";
import { AgentPageShell } from "./components/AgentPageShell";
import { cachedConfig, fetchConfig } from "./lib/config";
import { initialSettings, saveSettings } from "./lib/settings";
import type { AssistantConfig, Settings } from "./lib/types";

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
    <AgentPageShell
      slug="assistant"
      name={config?.name}
      loadError={loadError}
      isReady={!!(config && settings)}
      loadingSkeleton={<ChatSkeleton />}
      headerActions={
        <>
          <HeaderButton icon={PlusIcon} label="New" aria-label="New chat" onClick={newChat} />
          <HeaderButton icon={SettingsIcon} label="Settings" onClick={() => setShowSettings(true)} data-testid="open-settings" />
        </>
      }
      panels={
        config && settings ? (
          <SettingsPanel
            config={config}
            settings={settings}
            onChange={update}
            onNewChat={newChat}
            onClose={() => setShowSettings(false)}
            isOpen={showSettings}
          />
        ) : null
      }
    >
      {config && settings && (
        <Chat key={chatKey} settings={settings} config={config} onNewChat={newChat} />
      )}
    </AgentPageShell>
  );
}
