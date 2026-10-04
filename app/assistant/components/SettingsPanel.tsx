"use client";

import { PlusIcon } from "lucide-react";
import type { AssistantConfig, Settings } from "../lib/types";

export function SettingsPanel({
  config,
  settings,
  onChange,
  onNewChat,
  onClose,
  className = "",
}: {
  config: AssistantConfig;
  settings: Settings;
  onChange: (next: Settings) => void;
  onNewChat: () => void;
  onClose: () => void;
  className?: string;
}) {
  const label = "text-[13px] font-medium text-text/80";
  const locked = config.restrictPrompts; // the server uses its own system prompt
  return (
    <aside className={`h-full min-h-0 flex-col gap-5 overflow-y-auto border-l border-line bg-panel p-5 ${className}`} data-testid="settings">
      <button
        type="button"
        onClick={onClose}
        className="rounded-full bg-text px-4 py-2 text-[14px] font-semibold text-bg lg:hidden"
      >
        Done
      </button>
      <button
        onClick={onNewChat}
        className="flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[14px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.04]"
        data-testid="new-chat"
      >
        <PlusIcon className="size-4" />
        New chat
      </button>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor="model">Model</label>
        <select
          id="model"
          value={settings.model}
          onChange={(e) => onChange({ ...settings, model: e.target.value })}
          className="rounded-xl border border-line bg-panel2 px-3 py-2 text-base outline-hidden transition-colors focus:border-white/30 lg:text-[14px]"
        >
          {config.models.map((m) => (
            <option key={m.id} value={m.id} disabled={!m.available}>
              {m.label}
              {m.available ? "" : " — no API key"}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={label}>Tools</legend>
        {config.tools.map((t) => (
          <label key={t.name} className="flex items-start gap-2.5 text-[14px]">
            <input
              type="checkbox"
              checked={settings.tools.includes(t.name)}
              onChange={(e) =>
                onChange({
                  ...settings,
                  tools: e.target.checked
                    ? [...settings.tools, t.name]
                    : settings.tools.filter((n) => n !== t.name),
                })
              }
              className="mt-0.5 h-4 w-4 accent-text"
            />
            <span>
              <span className="font-mono text-[12px]">{t.name}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{t.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className={label} htmlFor="system-prompt">System prompt</label>
          {!locked && (
            <button
              onClick={() => onChange({ ...settings, systemPrompt: config.defaultSystemPrompt })}
              className="text-[12px] text-muted-foreground underline underline-offset-2 hover:text-text"
            >
              Reset
            </button>
          )}
        </div>
        <textarea
          id="system-prompt"
          value={settings.systemPrompt}
          onChange={(e) => onChange({ ...settings, systemPrompt: e.target.value })}
          readOnly={locked}
          placeholder="No system prompt — the model gets only your messages."
          rows={1}
          style={{ fieldSizing: "content" } as React.CSSProperties}
          className={`resize-none rounded-xl border border-line bg-panel2 px-3 py-2.5 text-base leading-relaxed outline-hidden transition-colors focus:border-white/30 lg:text-[14px] ${locked ? "cursor-not-allowed text-muted-foreground" : ""}`}
        />
        <p className="text-[12px] text-muted-foreground">
          {locked ? "Locked for this demo." : "Applies to your next message. Stored in this browser only."}
        </p>
      </div>
    </aside>
  );
}
