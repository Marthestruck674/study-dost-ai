"""FastAPI server for Study Dost AI (by Sami Ahraf Nirob).

Endpoints:
    GET  /healthz              -> {"ok": true}
    POST /api/explain          -> {step_by_step, real_world_analogy, visual_cue}
    POST /api/simpler          -> {explanation}
    POST /api/practice         -> {problem, answer, solution, difficulty}

CORS:
    Configured via ALLOWED_ORIGINS env var (comma-separated, "*" allowed).

Optional auth:
    If APP_API_KEY is set, every /api/* request must include
        X-API-Key: <APP_API_KEY>
"""

from __future__ import annotations

import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from utils import (
    ConceptClarityError,
    get_practice_problem,
    get_simpler_explanation,
    get_triple_explanation,
)

load_dotenv()

ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]
APP_API_KEY = os.getenv("APP_API_KEY", "").strip()

VALID_SUBJECTS = {"General", "Math", "Physics", "Chemistry", "Biology", "Computer Science"}
VALID_DIFFICULTIES = {"Easy", "Medium", "Hard"}
VALID_COUNTRIES = {"Default", "Bangladesh", "India"}

app = FastAPI(
    title="Study Dost AI",
    description="AI-powered STEM tutor backend by Sami Ahraf Nirob. Powered by Featherless.ai.",
    version="1.0.0",
    contact={"name": "Sami Ahraf Nirob"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Auth middleware (optional)
# ---------------------------------------------------------------------------

@app.middleware("http")
async def api_key_guard(request: Request, call_next):
    # Skip auth on CORS preflight (browsers cannot include custom headers
    # like X-API-Key on the OPTIONS request) — otherwise the preflight would
    # 401 and the real request would be blocked client-side.
    if (
        APP_API_KEY
        and request.method != "OPTIONS"
        and request.url.path.startswith("/api/")
    ):
        sent = request.headers.get("x-api-key", "")
        if sent != APP_API_KEY:
            return JSONResponse({"error": "Unauthorized"}, status_code=401)
    return await call_next(request)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ExplainBody(BaseModel):
    concept: str = Field(..., min_length=1, max_length=2000)
    subject: str = Field("General")
    country: str = Field("Default")

    @field_validator("subject")
    @classmethod
    def _check_subject(cls, v: str) -> str:
        if v not in VALID_SUBJECTS:
            raise ValueError(f"subject must be one of {sorted(VALID_SUBJECTS)}")
        return v

    @field_validator("country")
    @classmethod
    def _check_country(cls, v: str) -> str:
        # Be permissive: unknown country falls back to Default rather than 422.
        return v if v in VALID_COUNTRIES else "Default"


class PracticeBody(ExplainBody):
    difficulty: Literal["Easy", "Medium", "Hard"] = "Medium"


# ---------------------------------------------------------------------------
# Error handler
# ---------------------------------------------------------------------------

@app.exception_handler(ConceptClarityError)
async def cc_error_handler(_: Request, exc: ConceptClarityError):
    return JSONResponse({"error": str(exc)}, status_code=exc.status_code)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/healthz")
def healthz():
    return {"ok": True, "service": "study-dost-ai"}


@app.get("/")
def root():
    return {
        "service": "study-dost-ai",
        "author": "Sami Ahraf Nirob",
        "endpoints": ["/healthz", "/api/explain", "/api/simpler", "/api/practice"],
    }


@app.post("/api/explain")
def explain(body: ExplainBody):
    return get_triple_explanation(body.concept.strip(), body.subject, body.country)


@app.post("/api/simpler")
def simpler(body: ExplainBody):
    text = get_simpler_explanation(body.concept.strip(), body.subject, body.country)
    return {"explanation": text}


@app.post("/api/practice")
def practice(body: PracticeBody):
    data = get_practice_problem(
        body.concept.strip(), body.subject, body.difficulty, body.country
    )
    data["difficulty"] = body.difficulty
    return data


# ---------------------------------------------------------------------------
# Local dev entrypoint:  python main.py
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=False)
