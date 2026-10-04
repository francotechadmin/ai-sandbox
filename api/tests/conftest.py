import os
import sys
from pathlib import Path

# Make `api` importable as a package when running `pytest api/tests` from the
# repo root (api/index.py uses package-relative imports).
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

# Tests send free text; the restriction itself is tested explicitly.
os.environ.setdefault("ASSISTANT_ALLOW_ANY_PROMPT", "1")

from api.tests.fake_model import register_fake_model  # noqa: E402

register_fake_model()
