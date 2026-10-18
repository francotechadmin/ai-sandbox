"use client";

import { XIcon, PlusIcon } from "lucide-react";
import type { AssistantConfig, Settings } from "../lib/types";

export function SettingsPanel({
  config,
  settings,
  onChange,
  onNewChat,
  onClose,
  isOpen,
}: {
  config: AssistantConfig;
  settings: Settings;
  onChange: (next: Settings) => void;
  onNewChat: () => void;
  onClose: () => void;
  isOpen: boolean;
}) {
  if (!isOpen) return null;

  const label = "text-[13px] font-medium text-text/80";
  const locked = config.restrictPrompts;

  return (
    <>
      {/* Backdrop – sm+ only; mobile is full-screen */}
      <div className="hidden sm:block fixed inset-0 z-20 bg-black/50" onClick={onClose} aria-hidden />
      {/* Mobile: full-screen | sm+: centered modal */}
      <div className="fixed inset-0 z-30 overflow-y-auto bg-panel sm:flex sm:items-center sm:justify-center sm:overflow-visible sm:bg-transparent sm:p-4">
        <div
          className="flex min-h-full flex-col gap-5 p-5 sm:min-h-0 sm:w-full sm:max-w-sm sm:overflow-y-auto sm:rounded-2xl sm:border sm:border-line sm:bg-panel sm:p-5 sm:max-h-[85dvh]"
          data-testid="settings"
        >
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold">Settings</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-text"
              aria-label="Close settings"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <button
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[14px] font-medium transition-colors hover:border-white/30 hover:bg-white/[0.04]"
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
              className="rounded-xl border border-line bg-panel2 px-3 py-2 text-[14px] outline-hidden transition-colors focus:border-white/30"
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
              <label key={t.name} className="flex cursor-default items-start gap-2.5 text-[14px] select-none">
                <input
                  type="checkbox"
                  checked={settings.tools.includes(t.name)}
                  onChange={() => {}}
                  tabIndex={-1}
                  className="pointer-events-none mt-0.5 h-4 w-4 accent-text"
                  aria-readonly="true"
                />
                <span>
                  <span className="font-mono text-[12px]">{t.name}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{t.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-1.5">
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
              className={`resize-none rounded-xl border border-line bg-panel2 px-3 py-2.5 text-[14px] leading-relaxed outline-hidden transition-colors focus:border-white/30 ${locked ? "cursor-not-allowed text-muted-foreground" : ""}`}
            />
            <p className="text-[12px] text-muted-foreground">
              {locked ? "Locked for this demo." : "Applies to your next message. Stored in this browser only."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
