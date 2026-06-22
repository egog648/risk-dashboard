import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.scheduler import scheduler, setup_scheduler
from app.services.data_fetchers.cache import clear_request_cache, init_request_cache

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


class RequestCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        init_request_cache()
        try:
            return await call_next(request)
        finally:
            clear_request_cache()


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Response-Time"] = f"{duration_ms}ms"
        if request.url.path.startswith("/api/"):
            slow = duration_ms >= settings.SLOW_REQUEST_THRESHOLD_MS
            if slow:
                response.headers["X-Slow-Request"] = "1"
            log_fn = logger.warning if slow else logger.info
            log_fn(
                "request_timing path=%s method=%s status=%s duration_ms=%s threshold_ms=%s slow=%s",
                request.url.path,
                request.method,
                response.status_code,
                duration_ms,
                settings.SLOW_REQUEST_THRESHOLD_MS,
                slow,
            )
        return response


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
app.add_middleware(TimingMiddleware)
app.add_middleware(RequestCacheMiddleware)

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
    from app.core.config import settings
    from app.core.database import _sqlite_file_path

    route_paths = {
        getattr(route, "path", "")
        for route in app.routes
        if hasattr(route, "path")
    }
    sqlite_path = str(_sqlite_file_path() or "")
    return {
        "status": "ok",
        "database_url": settings.DATABASE_URL,
        "database_file": sqlite_path,
        "capabilities": {
            "portfolio_analytics": "/api/v1/portfolio/analytics" in route_paths,
            "suggested_frontier": True,
        },
    }
