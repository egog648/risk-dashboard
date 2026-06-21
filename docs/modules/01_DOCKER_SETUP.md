# Module 01 — Docker Setup

## Goal
Get both backend (FastAPI on :8000) and frontend (Next.js on :3000) running with one command.

## Files Involved
- `docker-compose.yml` (development)
- `docker-compose.prod.yml` (production)
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `backend/.env.example` → `backend/.env`
- `frontend/.env.local.example` → `frontend/.env.local`

## Steps

### 1. Configure environment files

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
FRED_API_KEY=your_actual_fred_key_here
TIINGO_API_KEY=your_actual_tiingo_key_here
DATABASE_URL=sqlite:///./data/risk_dashboard.db
APP_ENV=development
```

```bash
cp frontend/.env.local.example frontend/.env.local
```

`frontend/.env.local` only needs:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. Build and start containers

```bash
docker-compose up --build
```

On first run this will:
- Pull Python 3.11-slim and Node 20-alpine base images
- Install all Python dependencies (`pip install -r requirements.txt`)
- Install all Node dependencies (`npm install`)
- Start FastAPI with hot reload (`uvicorn --reload`)
- Start Next.js dev server (`npm run dev`)

### 3. Verify

```bash
curl http://localhost:8000/health
# → {"status": "ok"}

curl http://localhost:3000
# → Next.js HTML page
```

Full API docs: http://localhost:8000/docs

## Production Compose

Use this path to run release-oriented containers (no hot reload, no source bind mounts):

```bash
docker compose -f docker-compose.prod.yml up --build
```

On first run this will:
- Build backend with `target: production` (`uvicorn` with 2 workers, no `--reload`)
- Build frontend with `target: production` (`npm run build` then `npm run start`)
- Mount only `./backend/data` for SQLite persistence

Production frontend env (set in `docker-compose.prod.yml`):
- `NEXT_PUBLIC_API_URL=http://localhost:8000` — browser/client API calls from the host
- `INTERNAL_API_URL=http://backend:8000` — server-side prefetch inside the Docker network

After startup, run the bootstrap sequence in `docs/RUNBOOKS.md` (health → refresh → poll → smoke).

**Note:** Stop the dev stack before starting prod if both use ports 8000/3000.

## Notes
- The `backend/data/` directory is mounted as a volume so the SQLite database persists across container restarts.
- API keys are read from `backend/.env` by Pydantic settings (`FRED_API_KEY`, `TIINGO_API_KEY`) and are **never** hardcoded in source files.
- `backend/.env` and `frontend/.env.local` are in `.gitignore` and will never be committed.

## Troubleshooting
- Port already in use: Change `8000:8000` or `3000:3000` in `docker-compose.yml`
- Frontend can't reach backend: Ensure `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`
- FRED key error: Confirm `FRED_API_KEY` is set in `backend/.env` (not `.env.example`)
- Tiingo key error: Confirm `TIINGO_API_KEY` is set in `backend/.env`
