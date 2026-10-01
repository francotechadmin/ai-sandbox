# Model factory — the LangChain interoperability layer. Swap providers with
# one env var; nothing else in the app needs to change because everything
# downstream talks to LangChain's BaseChatModel interface, not a specific
# vendor SDK.
#
# Set MODEL_PROVIDER to "anthropic" (default) or "openai" in your Vercel
# project's env vars, with the matching API key:
#   MODEL_PROVIDER=anthropic   ANTHROPIC_API_KEY=...
#   MODEL_PROVIDER=openai      OPENAI_API_KEY=...
# Optionally override MODEL_NAME to pin a specific model.

import os


def get_model():
    provider = os.environ.get("MODEL_PROVIDER", "anthropic").lower()

    if provider == "openai":
        if not os.environ.get("OPENAI_API_KEY"):
            raise RuntimeError("MODEL_PROVIDER=openai but OPENAI_API_KEY is not set.")
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=os.environ.get("MODEL_NAME", "gpt-4.1-mini"), temperature=0)

    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("MODEL_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.")
    from langchain_anthropic import ChatAnthropic

    return ChatAnthropic(model=os.environ.get("MODEL_NAME", "claude-sonnet-5"), temperature=0)


def current_model_label() -> str:
    provider = os.environ.get("MODEL_PROVIDER", "anthropic").lower()
    default_name = "gpt-4.1-mini" if provider == "openai" else "claude-sonnet-5"
    name = os.environ.get("MODEL_NAME", default_name)
    return f"{provider}:{name}"
