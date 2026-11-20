import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import init_db
from . import scheduler
from .routers import admin, ai, applications, auth, chat, coaching, profile, questionnaire, scholarships

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
settings = get_settings()



@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    scheduler.start()
    yield
    scheduler.stop()


app = FastAPI(
    lifespan=lifespan,
    title="ScholarFit API",
    description="Collecte de bourses d'études, matching profil / bourses, assistant de recherche, CV et lettres, accompagnement des candidatures.",
    version="0.2.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, scholarships, profile, chat, applications, ai, admin, coaching, questionnaire):
    app.include_router(r.router)
app.include_router(coaching.admin_router)


@app.get("/api/health")
def health():
    return {"ok": True, "ia": "claude" if settings.ai_enabled else "hors-ligne (règles)", "modele": settings.claude_model if settings.ai_enabled else None}
