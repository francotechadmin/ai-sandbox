// Shapes shared between the assistant backend (api/assistant) and this page.

import type { ReadonlyJSONObject } from "assistant-stream/utils";

type StatePart =
  | { type: "reasoning"; step: number; text: string }
  | { type: "text"; step: number; text: string }
  | {
      type: "tool-call";
      step: number;
      toolCallId: string;
      toolName: string;
      args: ReadonlyJSONObject;
      status: "running" | "complete" | "error";
      result: string | null;
    };

export type StateMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      status: "running" | "complete" | "cancelled" | "error";
      parts: StatePart[];
      error?: string;
    };

// The whole chat lives in the browser and is sent back with every request.
export type ChatState = { messages: StateMessage[] };

type ModelInfo = {
  id: string;
  label: string;
  provider: string;
  available: boolean;
};

export type AssistantConfig = {
  defaultModel: string;
  defaultSystemPrompt: string;
  models: ModelInfo[];
  tools: { name: string; description: string }[];
};

export type Settings = {
  model: string;
  systemPrompt: string;
  tools: string[];
};
