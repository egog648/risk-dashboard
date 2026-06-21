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
- Status: Mitigated (Phase 4 doc reorg)
- Resolution: Added `docs/README.md` entry point, `docs/DOC_RULES.md`, and unified `BUILD.md` Part 2 index.
- Roadmap phase: Ongoing

### 7) Static vehicle suggestions in HTML profiler
- Severity: Medium
- Impact: Profiler hardcodes ETF names (VTI, JEPI, etc.) without advisor-controlled registry or live validation.
- Status: Resolved (Module 16)
- Resolution: `GET /api/v1/tickers/recommend` ranks active registry tickers by G/I/S cosine similarity with objective and aggression boosts. Profiler advisor report uses `VehicleSuggestions` with static fallback when registry is empty.
- Roadmap phase: Phase 4

### 8) Custom tickers excluded from efficient frontier
- Severity: Low
- Impact: Registry tickers (JEPI) cannot yet be optimized on the frontier curve.
- Current workaround: Use macro proxy tickers (SPY, LQD) for optimization; registry for implementation mapping.
- Planned fix: Dynamic `ASSET_TICKERS` from registry (v2).
- Roadmap phase: Phase 4 / deferred

### 9) Profiler save bypasses React Query cache invalidation
- Severity: Medium
- Impact: Saving from `/profiler` does not invalidate client/profile queries; `/clients/{id}` may show stale data until manual refresh.
- Status: Resolved (Refactor Wave 1)
- Resolution: `ProfilerContext` uses `useSaveClientProfileMutation` with the same invalidation keys as `useSaveClientProfile`.
- Roadmap phase: Refactor Track

### 10) Duplicate expected-return computation paths
- Severity: Medium
- Impact: Asset classes and portfolio optimizer compute expected returns independently; drift risk when assumptions change.
- Status: Resolved (Refactor Wave 2)
- Resolution: Shared `expected_returns.py` module consumed by portfolio optimizer; asset classes use same CPI/risk-free helpers via `AssetClassBase`.
- Roadmap phase: Refactor Track

### 11) Redundant series fetches on aggregate endpoints
- Severity: Low
- Impact: `/equities/all` and similar endpoints re-fetch shared FRED series multiple times per request.
- Status: Resolved (Refactor Wave 3)
- Resolution: Request-scoped memoization in `data_fetchers/cache.py` wired via middleware in `main.py`.
- Roadmap phase: Refactor Track

### 12) Returns method inconsistency in portfolio evaluation
- Severity: Low
- Impact: Frontier uses log returns; current-portfolio point evaluation uses simple returns; Sharpe/vol may differ slightly.
- Status: Resolved (Refactor Wave 3)
- Resolution: Portfolio endpoint reuses `mu`/`cov` from `build_frontier`, which uses log returns via `compute_returns`.
- Roadmap phase: Refactor Track

## Update Policy
- Add new gaps when a bug or limitation is confirmed.
- Update status/workaround when behavior changes.
- Remove only after fix is merged and validated by smoke tests.

## Related Docs
- `docs/README.md`
- `docs/ROADMAP.md`
