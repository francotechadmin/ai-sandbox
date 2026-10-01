"use client";

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
  const label = "text-[11px] font-semibold uppercase tracking-wide text-muted";

  return (
    <aside className={`h-full min-h-0 flex-col gap-5 overflow-y-auto rounded-xl border border-line bg-panel p-4 ${className}`} data-testid="settings">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-amber px-3 py-2 text-[13px] font-semibold text-bg lg:hidden"
      >
        Done
      </button>
      <button
        onClick={onNewChat}
        className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium hover:border-[#3a4451]"
        data-testid="new-chat"
      >
        New chat
      </button>

      <div className="flex flex-col gap-1.5">
        <label className={label} htmlFor="model">Model</label>
        <select
          id="model"
          value={settings.model}
          onChange={(e) => onChange({ ...settings, model: e.target.value })}
          className="rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-base outline-hidden lg:text-[13px]"
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
          <label key={t.name} className="flex items-start gap-2 text-[13px]">
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
              className="mt-0.5 h-4 w-4 accent-amber"
            />
            <span>
              <span className="font-mono text-[12px]">{t.name}</span>
              <span className="block text-[12px] text-muted">{t.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className={label} htmlFor="system-prompt">System prompt</label>
          <button
            onClick={() => onChange({ ...settings, systemPrompt: config.defaultSystemPrompt })}
            className="text-[11px] text-muted underline hover:text-text"
          >
            Reset
          </button>
        </div>
        <textarea
          id="system-prompt"
          value={settings.systemPrompt}
          onChange={(e) => onChange({ ...settings, systemPrompt: e.target.value })}
          placeholder="No system prompt — the model gets only your messages."
          className="min-h-[140px] flex-1 resize-none rounded-lg border border-line bg-panel2 px-2.5 py-2 text-base leading-relaxed outline-hidden lg:text-[13px]"
        />
        <p className="text-[11px] text-muted">Applies to your next message. Stored in this browser only.</p>
      </div>
    </aside>
  );
}
