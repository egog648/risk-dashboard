# Known Gaps

This file tracks confirmed limitations and unresolved risks that matter for roadmap planning and handoffs.

## Severity Legend
- High: can block core functionality or produce misleading results.
- Medium: impacts reliability, quality, or maintainability.
- Low: improvement item with limited immediate impact.

## Gaps Register

### 1) Portfolio weight schema mismatch
- Severity: High
- Impact: Some user-provided allocation fields may not map cleanly across frontend/backend, risking incorrect optimizer interpretation.
- Status: Resolved (Phase 1)
- Resolution: Backend schema now uses split corporate keys (`credit_corporate_ig`, `credit_corporate_hy`) to match frontend and optimizer mapping, with legacy `credit_corporate` mapped to IG for backward compatibility.
- Roadmap phase: Phase 1

### 2) Inconsistent empty-data handling in asset services
- Severity: High
- Impact: Some endpoints can fail when expected series/ticker data is empty.
- Status: Resolved (Phase 1)
- Resolution: Asset services now short-circuit to degraded `200` payloads with `data_status` and `missing_series` metadata when primary ticker data is unavailable.
- Roadmap phase: Phase 1

### 3) Dev-oriented runtime defaults
- Severity: Medium
- Impact: Dockerfiles currently run development servers (`npm run dev`, `uvicorn --reload`) which are not ideal for production deployment.
- Current workaround: Use current setup for local/dev only.
- Planned fix: Add production-grade Docker/runtime profiles and release checklist.
- Roadmap phase: Phase 3

### 4) Limited integration and end-to-end test coverage
- Severity: Medium
- Impact: Regressions may slip through because coverage is weighted toward unit logic.
- Current workaround: Use local pre-merge test suite execution; CI enforcement is still pending.
- Planned fix: Add CI workflow enforcement for backend smoke/contracts, frontend integration, and e2e happy path.
- Progress:
  - Phase 1: Added `backend/tests/test_api_smoke.py` for core health and `/api/v1/*` smoke coverage.
  - Phase 2: Added `backend/tests/test_api_contracts.py`, frontend Vitest/MSW integration tests under `frontend/tests/`, and `frontend/e2e/happy-path.spec.ts` with deterministic optimizer step; local runs are green.
- Roadmap phase: Phase 2

### 5) Hardcoded expected-return assumptions
- Severity: Medium
- Impact: Some return projections rely on static assumptions that may drift from market reality.
- Current workaround: Treat estimates as directional for prototype use.
- Planned fix: Replace hardcoded assumptions with sourced/calibrated inputs where feasible.
- Roadmap phase: Phase 3

### 6) Documentation drift risk
- Severity: Medium
- Impact: Setup confusion and onboarding delay when docs diverge from implementation.
- Current workaround: Cross-check docs with code during handoff.
- Planned fix: Keep docs update as part of definition-of-done and release checklist.
- Roadmap phase: Ongoing

## Update Policy
- Add new gaps when a bug or limitation is confirmed.
- Update status/workaround when behavior changes.
- Remove only after fix is merged and validated by smoke tests.

## Related Docs
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/HANDOFF_CHECKLIST.md`
