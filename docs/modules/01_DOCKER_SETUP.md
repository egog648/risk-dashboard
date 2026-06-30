# Module 01 — Docker Setup

## Goal
Get both backend (FastAPI on :8000) and frontend (Next.js on :3000) running with Docker.

## Files Involved
- `docker-compose.yml` (development)
- `docker-compose.prod.yml` (production)
- `backend/Dockerfile`, `backend/.dockerignore`
- `frontend/Dockerfile`, `frontend/.dockerignore`
- `scripts/docker-up.ps1`, `scripts/docker-up.sh`
- `Makefile` (optional shortcuts: `make build`, `make up`)
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

### 2. Enable BuildKit (recommended)

```powershell
# Windows PowerShell (per session or add to profile)
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"
```

```bash
# Linux / macOS
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

### 3. First-time build

```bash
docker compose build
```

On first build this will:
- Pull Python 3.11-slim and Node 20-alpine base images
- Install Python dependencies (`pip install -r requirements.txt`) with BuildKit cache
- Install Node dependencies (`npm ci`) with BuildKit cache
- `.dockerignore` files keep build contexts small (excludes `node_modules/`, `.next/`, tests, local DB)

### 4. Daily launch

```bash
docker compose up -d
```

Or use the launcher (creates missing env files, waits for health):

```powershell
.\scripts\docker-up.ps1
```

```bash
./scripts/docker-up.sh
```

Add `-Bootstrap` / `--bootstrap` on first run to refresh market data automatically.

The frontend starts only after the backend healthcheck passes (`GET /health`).

### 5. Verify

```bash
curl http://localhost:8000/health
# → {"status": "ok"}

curl http://localhost:3000
# → Next.js HTML page
```

Full API docs: http://localhost:8000/docs

### When to rebuild

Run `docker compose build` (not `up --build` on every start) when:
- `backend/requirements.txt` changes
- `frontend/package-lock.json` changes
- `backend/Dockerfile` or `frontend/Dockerfile` changes

Then: `docker compose up -d`

## Production Compose

Use this path to run release-oriented containers (no hot reload, no source bind mounts):

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

On first run this will:
- Build backend with `target: production` (`uvicorn` with 2 workers, no `--reload`)
- Build frontend with `target: production` (`npm run build` then `npm run start`)
- Mount only `./backend/data` for SQLite persistence

Production frontend env (set in `docker-compose.prod.yml`):
- `NEXT_PUBLIC_API_URL=http://localhost:8000` — browser/client API calls from the host
- `INTERNAL_API_URL=http://backend:8000` — server-side prefetch inside the Docker network

After startup, run the bootstrap sequence in `docs/RUNBOOKS.md` (health → refresh → poll → smoke), or use `scripts/docker-up.ps1 -Bootstrap`.

**Note:** Stop the dev stack before starting prod if both use ports 8000/3000.

## Notes
- The `backend/data/` directory is mounted as a volume so the SQLite database persists across container restarts.
- API keys are read from `backend/.env` by Pydantic settings (`FRED_API_KEY`, `TIINGO_API_KEY`) and are **never** hardcoded in source files.
- `backend/.env` and `frontend/.env.local` are in `.gitignore` and will never be committed.

## Troubleshooting

### Slow Docker on Windows
- Do **not** use `docker compose up --build` for daily launches — build once, then `docker compose up -d`.
- Ensure BuildKit is enabled (see step 2).
- First build still takes several minutes (apt-get + scientific Python stack); subsequent builds use cache.
- If Docker Desktop is stuck, fallback: run backend with `python -m uvicorn app.main:app --reload` and frontend with `npm run dev` (see `docs/RUNBOOKS.md`).

### Other issues
- Port already in use: Change `8000:8000` or `3000:3000` in `docker-compose.yml`
- Frontend can't reach backend: Ensure `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`
- FRED key error: Confirm `FRED_API_KEY` is set in `backend/.env` (not `.env.example`)
- Tiingo key error: Confirm `TIINGO_API_KEY` is set in `backend/.env`
