# Launch Runbook

**Audience:** Cursor agents and operators when the user says *"launch the app"*, *"start the app"*, or similar at the beginning of a work session.

**Goal:** Get frontend (`:3000`) and backend (`:8000`) running quickly. **Do not rebuild Docker images on every launch.**

---

## Default workflow (Windows — this project)

User environment is typically **Windows + Docker Desktop**. Prefer the launcher script over raw compose.

### Step 0 — Check if already running

```powershell
docker compose ps
Invoke-RestMethod http://localhost:8000/health
```

If backend returns `{"status":"ok"}` and containers are `Up` / `healthy`, **stop here** — report URLs and skip restart unless the user wants a fresh boot.

### Step 1 — Free blocked ports (if needed)

If `docker compose up` fails or ports are occupied by **non-Docker** processes (orphan uvicorn/node from a prior local session):

```powershell
netstat -ano | findstr ":8000 :3000"
# Stop orphan PIDs or run: docker compose down
```

Do **not** start a second stack while ports are in use.

### Step 2 — Ensure env files exist

- `backend/.env` — must exist with `FRED_API_KEY` and `TIINGO_API_KEY`
- `frontend/.env.local` — launcher creates from example if missing

If `backend/.env` is missing, tell the user to copy `backend/.env.example` and set keys. Do not commit secrets.

### Step 3 — Launch (daily — fast path)

```powershell
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"
.\scripts\docker-up.ps1
```

This runs `docker compose up -d`, waits for backend health, prints URLs.

**Do not** pass `-Build` unless images are missing or dependencies changed.

### Step 4 — Bootstrap data (only when needed)

Use `-Bootstrap` when:

- First run on a new machine
- Dashboard cards are empty / `overall_status` is `error`
- User explicitly needs fresh market data

```powershell
.\scripts\docker-up.ps1 -Bootstrap
```

Bootstrap triggers `POST /api/v1/data-status/refresh` and polls until status is not `error` (~2 min). **Skip on routine launches** to save time.

### Step 5 — Verify and report

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/api/v1/data-status | Select-Object overall_status
```

Report to the user:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

---

## When to rebuild images

Run **only** when `backend/requirements.txt`, `frontend/package-lock.json`, or Dockerfiles changed:

```powershell
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"
.\scripts\docker-up.ps1 -Build
```

Or: `docker compose build` then `.\scripts\docker-up.ps1`

**Never** use `docker compose up --build` as the default daily command — it forces unnecessary rebuilds (5–15+ min on Windows).

---

## Anti-patterns (slow launch)

| Avoid | Why |
|-------|-----|
| `docker compose up --build` every session | Rebuilds images unnecessarily |
| Parallel `docker compose build` + `docker compose up` | Docker Desktop on Windows can deadlock |
| Local uvicorn + `npm run dev` as default | User prefers Docker-first; use only if Docker is broken |
| `-Bootstrap` every launch | Adds ~2 min data refresh |
| Ignoring port conflicts | Orphan processes on 8000/3000 block containers |

---

## Linux / macOS

```bash
export DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1
./scripts/docker-up.sh
# or: make up
```

---

## Stop the app

```powershell
docker compose down
```

---

## Fallback (Docker broken or stuck)

Only if Docker fails after `docker compose down` and port cleanup:

```powershell
# Terminal 1
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2
cd frontend
npm run dev
```

Ensure `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`.

---

## Related docs

- [modules/01_DOCKER_SETUP.md](modules/01_DOCKER_SETUP.md) — first-time Docker setup
- [RUNBOOKS.md](RUNBOOKS.md) — incidents and bootstrap validation
- [HANDOFF_CHECKLIST.md](HANDOFF_CHECKLIST.md) — full smoke-test checklist
