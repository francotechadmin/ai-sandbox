import type { PromptInfo } from "@/app/assistant/lib/types";

// The agent's opening prompts name the open break with a "{break_id}"
// placeholder (the server accepts any id there, see api/assistant/prompts.py).
export function forBreak(prompts: PromptInfo[], breakId: string): PromptInfo[] {
  return prompts.map((p) => ({ ...p, prompt: p.prompt.replaceAll("{break_id}", breakId) }));
}
