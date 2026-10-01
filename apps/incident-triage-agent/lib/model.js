// Model factory — this is the LangChain interoperability layer. Swap
// providers with one env var; nothing else in the app needs to change
// because everything downstream talks to LangChain's ChatModel interface,
// not to a specific vendor SDK.
//
// Set MODEL_PROVIDER to "anthropic" (default) or "openai" in your Vercel
// project's env vars, with the matching API key:
//   MODEL_PROVIDER=anthropic   ANTHROPIC_API_KEY=...
//   MODEL_PROVIDER=openai      OPENAI_API_KEY=...
// Optionally override MODEL_NAME to pin a specific model.

import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";

export function getModel() {
  const provider = (process.env.MODEL_PROVIDER || "anthropic").toLowerCase();

  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("MODEL_PROVIDER=openai but OPENAI_API_KEY is not set.");
    }
    return new ChatOpenAI({
      model: process.env.MODEL_NAME || "gpt-4.1-mini",
      temperature: 0,
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("MODEL_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.");
  }
  return new ChatAnthropic({
    model: process.env.MODEL_NAME || "claude-sonnet-5",
    temperature: 0,
  });
}

export function currentModelLabel() {
  const provider = (process.env.MODEL_PROVIDER || "anthropic").toLowerCase();
  const name =
    process.env.MODEL_NAME || (provider === "openai" ? "gpt-4.1-mini" : "claude-sonnet-5");
  return `${provider}:${name}`;
}
