# Runbooks

Operational guidance for local and containerized development environments.

## Daily Ops Checks
- `GET /health` should return `{"status":"ok"}`.
- `GET /api/v1/data-status` should not remain in sustained `error` state.
- Frontend should load and render asset cards without repeated API errors.

## Test Suites

### Full suite (pre-merge)
- Backend (all tests):
  - `cd backend && pytest tests/`
  - Validated 2026-06-21: **49 passed**
- Frontend integration:
  - `cd frontend && npm run test`
  - Validated 2026-06-21: **13 files, 47 passed**
- Frontend production build:
  - `cd frontend && npm run build`
  - Validated 2026-06-21: **success (13 routes)**
- Frontend e2e (Playwright starts backend + frontend automatically when `CI=true`):
  - `cd frontend && npm run test:e2e`
  - Validated 2026-06-21: **1 passed** (~20–30s on clean ports)
  - Local reuse: set `PW_REUSE_SERVER=1` if backend/frontend are already running
  - Custom ports: `E2E_BACKEND_PORT=8010 E2E_FRONTEND_PORT=3010 npm run test:e2e`

### Focused subsets
- Backend smoke + contracts:
  - `cd backend && pytest tests/test_api_smoke.py tests/test_api_contracts.py`
- Ticker registry + recommendations:
  - `cd backend && pytest tests/test_ticker_registry.py tests/test_ticker_recommendations.py`

### Notes
- Playwright `webServer` in `frontend/playwright.config.ts` starts uvicorn (`:8000`) and Next dev (`:3000`) when `CI=true` (or when ports are free).
- Browser API calls use the Next.js rewrite proxy (`/api/backend/*`) to avoid CORS during dev/e2e.
- The e2e happy path triggers refresh via the test `request` fixture, waits for data status readiness, then asserts overview and optimizer UI.
- Frontier math is **mocked in e2e** (`POST .../portfolio/frontier` route fixture) for determinism; real frontier remains covered by backend unit tests.

## CI (GitHub Actions)

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — runs on every push and pull request to `main`.

| Job | Command (local equivalent) | Notes |
|-----|---------------------------|-------|
| `backend-test` | `cd backend && pytest tests/ -q` | Dummy API keys + `init_db()`; see workflow env |
| `frontend-test` | `cd frontend && npm run test` | MSW mocks; no backend |
| `frontend-build` | `cd frontend && npm run build` | Production compile check |
| `frontend-e2e` | `cd frontend && CI=true npm run test:e2e` | Playwright-managed servers; requires `FRED_API_KEY` + `TIINGO_API_KEY` repo secrets |

View runs: https://github.com/egog648/risk-dashboard/actions

**GitHub Actions secrets (one-time):** Settings → Secrets and variables → Actions → add `FRED_API_KEY` and `TIINGO_API_KEY`.

**Branch protection (manual):** In GitHub repo settings, require status checks `backend-test`, `frontend-test`, `frontend-build`, and optionally `frontend-e2e` on `main` before merge.

## Observability

### Request timing (`TimingMiddleware`)

Every `/api/*` request logs:

```
request_timing path=/api/v1/equities/all method=GET status=200 duration_ms=42.5 threshold_ms=2000 slow=False
```

Response headers:
- `X-Response-Time` — always set (e.g. `42.5ms`)
- `X-Slow-Request: 1` — set when duration exceeds threshold

**Threshold:** `SLOW_REQUEST_THRESHOLD_MS` (default **2000** ms). Configurable in `backend/.env` / [`backend/app/core/config.py`](../backend/app/core/config.py).

When `slow=True`, the log line is emitted at **WARNING** instead of INFO.

### Data refresh run metrics

`refresh_all_data()` tracks the last run in memory (`backend/app/core/observability.py`). Poll via:

```
GET /api/v1/data-status
```

Response field `last_refresh_run` (null before first refresh):

| Field | Meaning |
|-------|---------|
| `state` | `idle`, `running`, `completed`, or `failed` |
| `duration_ms` | Wall-clock time of last completed run |
| `total_series` | FRED + Tiingo targets refreshed |
| `ok_count` / `error_count` | Per-series success vs failure |
| `failed_series` | Up to 10 series IDs that errored |

Refresh completion logs at INFO (`refresh_run_complete`). WARNING (`refresh_run_errors`) when any series fails or when `error_count / total_series >= REFRESH_ERROR_WARN_RATIO` (default **0.25**).

**Note:** Metrics reset on process restart (in-memory only; acceptable for local/prototype use).

### Interpreting alerts

| Signal | Action |
|--------|--------|
| `last_refresh_run.error_count > 0` | Check API keys; inspect `failed_series`; re-trigger refresh |
| `overall_status=error` and >50% series in error | Follow **Escalation Criteria** below |
| `X-Slow-Request: 1` on warm `/all` calls | Check response cache hit rate; see `PERFORMANCE_BASELINE.md` |

## Production Compose Startup

Use production Dockerfile stages without dev bind mounts:

```bash
docker compose -f docker-compose.prod.yml up --build
```

Then run the same bootstrap sequence as development (steps 2–6 below), substituting the prod compose command where relevant.

## First-Run Bootstrap Validation (Deterministic)
Use this exact sequence on a fresh environment:
1. Start services: `docker-compose up --build` (dev) or `docker compose -f docker-compose.prod.yml up --build` (prod).
2. Wait for backend health: `GET /health` is `{"status":"ok"}`.
3. Trigger refresh: `POST /api/v1/data-status/refresh`.
4. Poll readiness: `GET /api/v1/data-status` until `overall_status` is not `error`.
5. Run smoke checks:
   - `GET /api/v1/equities/all`
   - `GET /api/v1/credit/all`
   - `GET /api/v1/credit/yield-curve`
   - `GET /api/v1/hard-assets/all`
   - `GET /api/v1/cash/all`
6. Optional automated smoke:
   - `cd backend && pytest tests/test_api_smoke.py`

## Common Incident: Missing or Invalid API Keys
### Symptoms
- Data status shows many errors.
- Asset endpoints return stale/insufficient data behavior.

### Checks
- Verify `backend/.env` exists and contains:
  - `FRED_API_KEY`
  - `TIINGO_API_KEY`

### Recovery
1. Update `backend/.env` with valid keys.
2. Restart services (`docker-compose up --build` or restart backend process).
3. Trigger refresh: `POST /api/v1/data-status/refresh`.
4. Verify `GET /api/v1/data-status` improves to `ok`/`stale` with fewer errors.

## Common Incident: Empty/Stale Data After Startup
### Symptoms
- Cards/charts show incomplete values.
- Portfolio endpoint returns insufficient data errors.

### Checks
- Call `GET /api/v1/data-status` to inspect per-series status.
- Confirm initial refresh has been triggered at least once.

### Recovery
1. Trigger refresh: `POST /api/v1/data-status/refresh`.
2. Wait for background fetch completion.
3. Re-check `GET /api/v1/data-status`.
4. Refresh frontend and re-check core endpoints:
   - `/api/v1/equities/all`
   - `/api/v1/credit/all`
   - `/api/v1/hard-assets/all`
   - `/api/v1/cash/all`

## Common Incident: Frontend Cannot Reach Backend
### Symptoms
- Frontend requests fail immediately.
- Browser network errors against backend API.

### Checks
- Confirm backend is reachable at `http://localhost:8000/health`.
- Confirm frontend env value:
  - `NEXT_PUBLIC_API_URL=http://localhost:8000`

### Recovery
1. Fix frontend env file if incorrect.
2. Restart frontend service/app.
3. Verify requests succeed from browser and route data appears.

## Common Incident: Container Port Conflict
### Symptoms
- Docker startup fails with "port already in use".

### Recovery
1. Free conflicting local process, or
2. Remap ports in `docker-compose.yml` (keep docs in sync if changed), then restart stack.

## Common Incident: Data DB Corruption or Bad Local State
### Symptoms
- Repeated backend errors after refresh retries.
- Unexpected deserialize/query failures against SQLite cache.

### Recovery (local/dev only)
1. Stop services.
2. Back up then clear local DB file in `backend/data/` if needed.
3. Restart stack.
4. Trigger a fresh data refresh.
5. Re-verify health/data status endpoints.

## Rollback Guidance
- If a change destabilizes runtime, revert to last known good commit and restart services.
- Re-run smoke checks from `docs/HANDOFF_CHECKLIST.md` before resuming feature work.

## Escalation Criteria
- `overall_status=error` persists across multiple refresh cycles.
- >50% of tracked series remain in error after valid key checks.
- Core endpoints consistently fail even after restart and refresh.

## Related Docs
- `docs/HANDOFF_CHECKLIST.md`
- `docs/BUILD.md`
- `docs/KNOWN_GAPS.md`
