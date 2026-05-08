# Handoff Checklist

Use this checklist when handing the project to a new chat or contributor.

## 1) Context Package
- Read in order:
  1. `README.md`
  2. `docs/BUILD.md`
  3. `docs/ARCHITECTURE.md`
  4. `docs/ROADMAP.md`
  5. `docs/KNOWN_GAPS.md`
- Confirm current objective for the incoming owner (bug fix, feature build, hardening, docs-only).

## 2) Environment Setup
- Backend env:
  - Copy `backend/.env.example` to `backend/.env`
  - Set required keys:
    - `FRED_API_KEY`
    - `TIINGO_API_KEY`
- Frontend env:
  - Copy `frontend/.env.local.example` to `frontend/.env.local`
  - Default local backend:
    - `NEXT_PUBLIC_API_URL=http://localhost:8000`

## 3) Launch
- Start stack:
  - `docker-compose up --build`
- Open:
  - Frontend: `http://localhost:3000`
  - Backend docs: `http://localhost:8000/docs`

## 3.5) Deterministic First-Run Bootstrap (required)
Run this sequence in order before validating app behavior:
1. Verify health: `GET /health` returns `{"status":"ok"}`.
2. Trigger initial refresh: `POST /api/v1/data-status/refresh`.
3. Poll status: `GET /api/v1/data-status` until `overall_status` is no longer `error`.
4. Execute core smoke checks in section 4.

## 4) Smoke Tests
- Health endpoint:
  - `GET /health` returns `{"status":"ok"}`
- Data status endpoint:
  - `GET /api/v1/data-status` returns a valid `overall_status`
- Trigger refresh:
  - `POST /api/v1/data-status/refresh`
  - Re-check status after refresh completes
- Core endpoint checks:
  - `GET /api/v1/equities/all`
  - `GET /api/v1/credit/all`
  - `GET /api/v1/credit/yield-curve`
  - `GET /api/v1/hard-assets/all`
  - `GET /api/v1/cash/all`
- Preferred automated path:
  - `cd backend && pytest tests/test_api_smoke.py`

## 5) Data Readiness Verification
- Confirm at least one successful refresh record per major series/ticker class in data status output.
- Confirm dashboard cards/charts render with non-empty values.
- Confirm portfolio page returns a frontier response for a default weight set.

## 6) Handoff Notes to Include
- Branch name and latest intent.
- What was completed vs intentionally deferred.
- Any temporary assumptions/workarounds introduced.
- Exact next task (single clear priority).
- Related roadmap phase reference from `docs/ROADMAP.md`.

## 7) Definition of Done for Each Future Change
- Code and docs are both updated if behavior changed.
- Any new endpoint/contract changes are reflected in docs.
- Known gaps are updated when issues are found or fixed.
- The handoff note leaves one unambiguous next action for the next owner.

## Related Docs
- `docs/ARCHITECTURE.md`
- `docs/RUNBOOKS.md`
- `docs/KNOWN_GAPS.md`
- `docs/ROADMAP.md`
