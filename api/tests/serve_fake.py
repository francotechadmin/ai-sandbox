# The API with the scripted "demo-fake" model added, for the browser (e2e)
# tests and for trying the UI without API keys:
#   uvicorn api.tests.serve_fake:app --port 8000

from api.index import app
from api.tests.fake_model import register_fake_model

register_fake_model()

__all__ = ["app"]
