# Runbooks

Operational guidance for local and containerized development environments.

## Daily Ops Checks
- `GET /health` should return `{"status":"ok"}`.
- `GET /api/v1/data-status` should not remain in sustained `error` state.
- Frontend should load and render asset cards without repeated API errors.

## Test Suites (Phase 2)
- Backend smoke + contracts:
  - `cd backend && pytest tests/test_api_smoke.py tests/test_api_contracts.py`
- Ticker registry:
  - `cd backend && pytest tests/test_ticker_registry.py`
- Frontend integration tests:
  - `cd frontend && npm run test`
- Frontend e2e happy path:
  - `cd frontend && npm run test:e2e`

### Notes
- The e2e happy path assumes a reachable backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) with valid `FRED_API_KEY` and `TIINGO_API_KEY`.
- The e2e flow triggers refresh and waits for data status readiness before asserting overview and optimizer behavior.

## First-Run Bootstrap Validation (Deterministic)
Use this exact sequence on a fresh environment:
1. Start services: `docker-compose up --build`.
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
