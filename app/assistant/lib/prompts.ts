import type { PromptInfo } from "./types";

const normalize = (text: string) => text.split(/\s+/).filter(Boolean).join(" ");

// The prompts that can be sent next, given the user messages so far (the
// server enforces the same walk down the trees in api/assistant/prompts.py).
export function nextChoices(prompts: PromptInfo[], sent: string[]): PromptInfo[] {
  let choices = prompts;
  for (const text of sent) {
    const node = choices.find((p) => normalize(p.prompt) === normalize(text));
    if (!node) return [];
    choices = node.followUps ?? [];
  }
  return choices;
}
