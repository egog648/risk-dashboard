# Known Gaps

This file tracks confirmed limitations and unresolved risks that matter for roadmap planning and handoffs.

## Severity Legend
- High: can block core functionality or produce misleading results.
- Medium: impacts reliability, quality, or maintainability.
- Low: improvement item with limited immediate impact.

## Verified Gaps Summary

| # | Gap | Severity | Phase | Status |
|---|-----|----------|-------|--------|
| 3 | Dev-oriented Docker compose defaults | Medium | Phase 3 | Open |
| 4 | CI enforcement (core tests) | Medium | Phase 2 | Resolved |
| 5 | Hardcoded expected-return assumptions | Medium | Phase 3 | Open |
| 8 | Custom tickers excluded from frontier | Low | Deferred | Open |
| 13 | Clients/profiler/tickers test coverage | Medium | Phase 2 tail | Open |
| 14 | E2E mocks optimizer response | Low | Phase 2 tail | Open |
| 15 | `datetime.utcnow()` deprecation warnings | Low | Phase 3 | Open |
| 16 | React Query `staleTime` not unified to 60s | Low | — | Open |

Resolved gaps (#1, #2, #7, #9–#12) are listed below for history.

## Gaps Register

### 1) Portfolio weight schema mismatch
- Severity: High
- Status: Resolved (Phase 1)
- Resolution: Backend schema uses split corporate keys with legacy `credit_corporate` mapped to IG.

### 2) Inconsistent empty-data handling in asset services
- Severity: High
- Status: Resolved (Phase 1)
- Resolution: Degraded `200` payloads with `data_status` and `missing_series` metadata.

### 3) Dev-oriented runtime defaults
- Severity: Medium
- Impact: `docker-compose.yml` targets `development` for both services (`npm run dev`, `uvicorn --reload`). Production stages exist in Dockerfiles but are not wired into default compose.
- Current workaround: Use current setup for local/dev only.
- Planned fix: Add production compose profile and validated release startup path.
- Roadmap phase: Phase 3

### 4) Limited integration and end-to-end test coverage / no CI
- Severity: Medium
- Status: **Partially resolved** (2026-06-21)
- Resolution: GitHub Actions CI enforces backend pytest, frontend Vitest, and `next build` on push/PR to `main` (`.github/workflows/ci.yml`). Playwright e2e remains local-only; clients/profiler coverage gap tracked in #13.
- Remaining: E2e in CI (#14); expand test coverage for advisory surfaces (#13).
- Roadmap phase: Phase 2 (core CI closed); e2e deferred

### 5) Hardcoded expected-return assumptions
- Severity: Medium
- Impact: Some return projections rely on static constants in `expected_returns.py` (e.g. earnings yield defaults, REIT spread assumptions).
- Current workaround: Treat estimates as directional for prototype use.
- Planned fix: Replace with sourced/calibrated inputs; version assumptions in `METHODOLOGY.md`.
- Roadmap phase: Phase 3

### 6) Documentation drift risk
- Severity: Medium
- Status: Mitigated (2026-06-21 doc SSOT reconciliation)
- Resolution: `DOC_RULES.md` conflict resolution, BUILD/API sync, ROADMAP phase status updated.

### 7) Static vehicle suggestions in HTML profiler
- Severity: Medium
- Status: Resolved (Module 16)

### 8) Custom tickers excluded from efficient frontier
- Severity: Low
- Impact: Registry tickers (JEPI) cannot yet be optimized on the frontier curve.
- Current workaround: Use macro proxy tickers (SPY, LQD) for optimization.
- Planned fix: Dynamic `ASSET_TICKERS` from registry (v2).
- Roadmap phase: Deferred

### 9) Profiler save bypasses React Query cache invalidation
- Severity: Medium
- Status: Resolved (Refactor Wave 1)

### 10) Duplicate expected-return computation paths
- Severity: Medium
- Status: Resolved (Refactor Wave 2)

### 11) Redundant series fetches on aggregate endpoints
- Severity: Low
- Status: Resolved (Refactor Wave 3)

### 12) Returns method inconsistency in portfolio evaluation
- Severity: Low
- Status: Resolved (Refactor Wave 3)

### 13) Clients/profiler/tickers surfaces lack test coverage
- Severity: Medium
- Impact: Largest untested API and UI surfaces; regressions in advisory workflow may go unnoticed.
- Evidence: No `test_clients.py`; no frontend tests for `/clients`, `/profiler`, `/tickers` routes.
- Planned fix: Backend contract tests for clients API; frontend integration tests for key advisory flows.
- Roadmap phase: Phase 2 tail / Phase 3

### 14) E2E happy path mocks optimizer response
- Severity: Low
- Impact: Playwright e2e does not exercise real frontier math end-to-end; overview step may also fail on selector/timing drift.
- Evidence: `frontend/e2e/happy-path.spec.ts` routes `POST /api/v1/portfolio/frontier` to a fixture; 2026-06-21 validation run failed on overview heading visibility.
- Planned fix: Optional e2e mode with real backend frontier; stabilize overview selectors/waits.
- Roadmap phase: Phase 2 tail

### 15) `datetime.utcnow()` deprecation warnings
- Severity: Low
- Impact: Non-blocking pytest deprecation warnings; will break in future Python versions.
- Planned fix: Replace with timezone-aware `datetime.now(UTC)` across backend.
- Roadmap phase: Phase 3

### 16) React Query `staleTime` not unified to 60s
- Severity: Low
- Impact: Refactor target was 60s global staleTime; asset hooks and ClientShell still use 5 min (data-status uses 60s).
- Planned fix: Align staleTime policy or document intentional 5-min default for asset metrics.
- Roadmap phase: Low priority cleanup

## Update Policy
- Add new gaps when a bug or limitation is confirmed by code inspection or validation.
- Update status/workaround when behavior changes.
- Remove only after fix is merged and validated by smoke tests.

## Related Docs
- `docs/README.md`
- `docs/ROADMAP.md`
