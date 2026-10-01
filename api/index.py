# Single FastAPI app for the whole sandbox, deployed as one Vercel Python
# serverless function. Every demo's backend is a router mounted here —
# adding a demo means adding a router, not a new deployment (see
# vercel.json, which routes all of /api/* to this file).

from fastapi import FastAPI

from .assistant.router import router as assistant_router
from .incident_triage.router import router as incident_triage_router

app = FastAPI(title="AI Sandbox API")

app.include_router(incident_triage_router)
app.include_router(assistant_router)
