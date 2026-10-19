# Router for the Trade Break Triage demo. Mounted under /api/triage in api/index.py.
# The agent itself runs through /api/assistant/chat (agents/triage.json); this only
# serves the break list the UI shows beside the chat.

from typing import Any

from fastapi import APIRouter

from .tools import breaks

router = APIRouter(prefix="/api/triage", tags=["triage"])


@router.get("/breaks")
def list_breaks() -> list[dict[str, Any]]:
    return breaks()
