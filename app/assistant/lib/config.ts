import type { AssistantConfig } from "./types";

// The config is static per deploy, so the browser keeps the last copy: a repeat
// visit renders at once and the fetch below only refreshes it. The landing page
// also calls fetchConfig() to wake the backend before the demo is opened.
const key = (agent: string | null) => `assistant-config-v1:${agent ?? ""}`;
const inflight = new Map<string, Promise<AssistantConfig>>();

export function cachedConfig(agent: string | null): AssistantConfig | null {
  try {
    const raw = window.localStorage.getItem(key(agent));
    return raw ? (JSON.parse(raw) as AssistantConfig) : null;
  } catch {
    return null;
  }
}

export function fetchConfig(agent: string | null): Promise<AssistantConfig> {
  const k = key(agent);
  let p = inflight.get(k);
  if (!p) {
    p = fetch(`/api/assistant/config${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`)
      .then((r) => (r.ok ? (r.json() as Promise<AssistantConfig>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((c) => {
        try {
          window.localStorage.setItem(k, JSON.stringify(c));
        } catch {
          /* storage unavailable — just no cache */
        }
        return c;
      })
      .finally(() => inflight.delete(k));
    inflight.set(k, p);
  }
  return p;
}
