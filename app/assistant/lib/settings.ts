import type { AssistantConfig, Settings } from "./types";

// One saved set of settings per agent: their prompts, models and tools differ.
const key = (agent: string) => `assistant-settings-v1:${agent}`;

// Settings live in the browser; the backend holds no prompt or preference of
// its own. First visit starts from the server's seed values (config endpoint).
export function initialSettings(config: AssistantConfig): Settings {
  const fallback: Settings = {
    model:
      config.models.find((m) => m.id === config.defaultModel && m.available)?.id ??
      config.models.find((m) => m.available)?.id ??
      config.defaultModel,
    systemPrompt: config.defaultSystemPrompt,
    tools: config.tools.map((t) => t.name),
  };
  try {
    const raw = window.localStorage.getItem(key(config.agent));
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<Settings>;
    const known = new Set(config.models.map((m) => m.id));
    return {
      model: saved.model && known.has(saved.model) ? saved.model : fallback.model,
      // Locked servers always use their own default, whatever was saved.
      systemPrompt:
        typeof saved.systemPrompt === "string" && !config.restrictPrompts ? saved.systemPrompt : fallback.systemPrompt,
      tools: Array.isArray(saved.tools)
        ? saved.tools.filter((t) => config.tools.some((c) => c.name === t))
        : fallback.tools,
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(agent: string, settings: Settings): void {
  try {
    window.localStorage.setItem(key(agent), JSON.stringify(settings));
  } catch {
    /* storage unavailable — settings just won't persist */
  }
}
