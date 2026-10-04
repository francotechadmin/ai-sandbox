# The API with the scripted "demo-fake" model added, for the browser (e2e)
# tests and for trying the UI without API keys:
#   uvicorn api.tests.serve_fake:app --port 8000

import os

# Free text, so the UI tests can send whatever they like.
os.environ.setdefault("ASSISTANT_ALLOW_ANY_PROMPT", "1")

from api.assistant import router  # noqa: E402
from api.index import app  # noqa: E402
from api.tests.fake_model import FAKE_TRACE_URL, register_fake_model  # noqa: E402

register_fake_model()


async def _fake_share_trace(run_id):
    return FAKE_TRACE_URL


router.share_trace = _fake_share_trace

__all__ = ["app"]
