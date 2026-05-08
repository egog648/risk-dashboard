import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.scheduler import scheduler, setup_scheduler

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Risk Dashboard API",
    description="Macro risk and expected return calculations for major asset classes",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def on_startup():
    init_db()
    setup_scheduler()
    scheduler.start()
    logger.info("Risk Dashboard API started")


@app.on_event("shutdown")
async def on_shutdown():
    scheduler.shutdown()


@app.get("/health")
def health():
    return {"status": "ok"}
