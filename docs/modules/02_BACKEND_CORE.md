# Module 02 — Backend Core

## Goal
FastAPI application with SQLite database, Pydantic settings, and all API routes registered.

## Files Involved
- `backend/app/main.py` — FastAPI app, CORS, startup hooks
- `backend/app/core/config.py` — Pydantic BaseSettings (reads .env)
- `backend/app/core/database.py` — SQLAlchemy engine, session, Base
- `backend/app/core/scheduler.py` — APScheduler daily data refresh
- `backend/app/api/v1/router.py` — Main API router
- `backend/app/models/db_models.py` — SQLAlchemy ORM models
- `backend/app/models/schemas.py` — Pydantic response schemas

## Key Design Decisions

### API key protection
`config.py` uses `pydantic-settings`:
```python
class Settings(BaseSettings):
    FRED_API_KEY: str  # Read from .env — never hardcoded
    model_config = SettingsConfigDict(env_file=".env")
```
The `settings` singleton is imported wherever the key is needed.

### Database session pattern
All endpoints use FastAPI dependency injection:
```python
@router.get("/equities/large-cap")
def get_metrics(db: Session = Depends(get_db)):
    ...
```
`get_db()` yields a session and closes it in `finally`.

### Startup sequence
On startup (`@app.on_event("startup")`):
1. `init_db()` — creates SQLite tables from ORM models
2. `setup_scheduler()` — registers daily data refresh job
3. `scheduler.start()` — begins APScheduler background thread

## Verify
```bash
curl http://localhost:8000/health
# {"status": "ok"}

curl http://localhost:8000/docs
# Swagger UI with all endpoints listed
```

## Adding new endpoints
1. Create `backend/app/api/v1/endpoints/my_new_asset.py`
2. Define a FastAPI `router = APIRouter()`
3. Register in `backend/app/api/v1/router.py`:
   ```python
   api_router.include_router(my_new_asset.router, prefix="/my-asset", tags=["My Asset"])
   ```
