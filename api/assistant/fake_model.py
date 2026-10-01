# Scripted chat model for tests and for running the UI without API keys
# (enabled by ASSISTANT_FAKE_MODEL=1). It streams chunks in the same shape the
# real Anthropic integration produces, so the real normalisation path runs.

import os
import re
import time
from typing import Any, Iterator

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel, generate_from_stream
from langchain_core.messages import (
    AIMessageChunk,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.outputs import ChatGenerationChunk, ChatResult

from .history import message_text

_EXPR = re.compile(r"[-+*/().\d\s]*\d[-+*/().\d\s]*[-+*/][-+*/().\d\s]*\d[-+*/().\d\s]*")


_MARKDOWN_SAMPLE = """## Markdown check

Here is **bold**, *italic*, `inline code` and a [link](https://example.com).

- First item
- Second item

```python
def add(a, b):
    return a + b
```

| Model | Provider |
|-------|----------|
| Haiku | Anthropic |
| GPT-5 mini | OpenAI |
"""


class ScriptedChatModel(BaseChatModel):
    reasoning: bool = False
    tool_names: list[str] = []

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def bind_tools(self, tools: Any, **kwargs: Any):
        names = [t.get("name") if isinstance(t, dict) else getattr(t, "name", None) for t in tools]
        return self.model_copy(update={"tool_names": [n for n in names if n]})

    def _generate(self, messages, stop=None, run_manager=None, **kwargs) -> ChatResult:
        return generate_from_stream(self._stream(messages, stop, run_manager, **kwargs))

    def _stream(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        system = next((message_text(m.content) for m in messages if isinstance(m, SystemMessage)), "")
        human = next((message_text(m.content) for m in reversed(messages) if isinstance(m, HumanMessage)), "")
        tool_msg = messages[-1] if messages and isinstance(messages[-1], ToolMessage) else None
        if "boom" in human.lower():
            raise RuntimeError("scripted failure")
        meta = {"model_provider": "anthropic"}
        msg_id = "run-scripted"
        index = 0

        delay = float(os.environ.get("ASSISTANT_FAKE_DELAY", "0"))

        def chunk(**kw: Any) -> ChatGenerationChunk:
            if delay:
                time.sleep(delay)  # lets UI tests observe incremental streaming
            return ChatGenerationChunk(
                message=AIMessageChunk(id=msg_id, response_metadata=meta, **kw)
            )

        if self.reasoning:
            thought = "Considering the request" + (
                " and the tool result." if tool_msg else ", checking whether a tool helps."
            )
            for word in re.findall(r"\S+\s*", thought):
                yield chunk(content=[{"type": "thinking", "thinking": word, "index": index}])
            index += 1

        match = _EXPR.search(human)
        if tool_msg is None and match and "calc" in human.lower() and "calculator" in self.tool_names:
            yield chunk(
                content=[
                    {"type": "tool_use", "id": "call_scripted_1", "name": "calculator", "input": {}, "index": index}
                ],
                tool_call_chunks=[
                    {"name": "calculator", "args": "", "id": "call_scripted_1", "index": index}
                ],
            )
            expr = match.group(0).strip()
            args = '{"expression": "%s"}' % expr
            for i in range(0, len(args), 8):
                part = args[i : i + 8]
                yield chunk(
                    content=[{"type": "input_json_delta", "partial_json": part, "index": index}],
                    tool_call_chunks=[{"name": None, "args": part, "id": None, "index": index}],
                )
            return

        answer = f"[system: {system or 'none'}] "
        answer += (
            f"The tool returned {message_text(tool_msg.content)}."
            if tool_msg is not None
            else f"You said: {human}"
        )
        if tool_msg is None and "markdown" in human.lower():
            answer = _MARKDOWN_SAMPLE
        for word in re.findall(r"\S+\s*", answer):
            yield chunk(content=[{"type": "text", "text": word, "index": index}])
