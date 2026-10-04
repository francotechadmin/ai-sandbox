import type { LangChainMessage } from "@assistant-ui/react-langgraph";

// The whole chat is LangChain's own message list (assistant-ui's LangGraph
// transport pattern). It lives in the browser and is sent back with every
// request, so the backend stays stateless.
// `traceUrl` is the public LangSmith trace of the last turn (null when tracing is off).
export type ChatState = { messages: LangChainMessage[]; traceUrl?: string | null };

type ModelInfo = {
  id: string;
  label: string;
  provider: string;
  available: boolean;
};

// A prompt users may send, with the follow-ups that can come after it.
export type PromptInfo = { title: string; label?: string; prompt: string; followUps?: PromptInfo[] };

export type AssistantConfig = {
  defaultModel: string;
  defaultSystemPrompt: string;
  models: ModelInfo[];
  tools: { name: string; description: string }[];
  // When restricted, the input bar is locked and users walk down these prompt trees.
  restrictPrompts: boolean;
  placeholder: string; // shown in the locked input bar
  endNote: string; // shown when a conversation has run out of follow-ups
  prompts: PromptInfo[];
};

export type Settings = {
  model: string;
  systemPrompt: string;
  tools: string[];
};
