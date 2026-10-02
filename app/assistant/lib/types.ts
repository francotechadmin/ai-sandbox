import type { LangChainMessage } from "@assistant-ui/react-langgraph";

// The whole chat is LangChain's own message list (assistant-ui's LangGraph
// transport pattern). It lives in the browser and is sent back with every
// request, so the backend stays stateless.
export type ChatState = { messages: LangChainMessage[] };

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
