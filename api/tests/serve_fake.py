# The API with the scripted "demo-fake" model added, for the browser (e2e)
# tests and for trying the UI without API keys:
#   uvicorn api.tests.serve_fake:app --port 8000

import os

# Free text, so the UI tests can send whatever they like.
os.environ.setdefault("ASSISTANT_ALLOW_ANY_PROMPT", "1")

from api.index import app  # noqa: E402
from api.tests.fake_model import register_fake_model  # noqa: E402

register_fake_model()

__all__ = ["app"]
