# Roadmap

This roadmap moves the project from prototype to stable and handoff-friendly development.

## Phase 1 — Stabilize Correctness
Goal: make core API/UI behavior reliable under normal local usage.

### Progress Snapshot
- Completed: portfolio weight schema alignment across frontend/backend/optimizer with legacy key compatibility mapping.
- Completed: standardized empty-data guards in asset services with degraded `200` responses and status metadata.
- Completed: backend API smoke tests for `/health`, `/api/v1/data-status`, refresh trigger, all-asset endpoints, and yield curve.
- Completed: deterministic first-run bootstrap sequence documented in build and runbook/checklist docs.

### Priorities
- Align portfolio weight schema across frontend payloads, backend models, and optimizer mapping.
- Add standardized empty-data guards in asset services.
- Create endpoint smoke-test coverage for core `/api/v1/*` surfaces.
- Lock down deterministic first-run bootstrap instructions (env + refresh sequence).

### Exit Criteria
- Portfolio request/response uses one consistent allocation key set.
- Core endpoints return stable success or explicit actionable error responses.
- Smoke tests pass for health, status, all-asset endpoints, and yield curve.
- New contributor can boot and validate app using only docs.

### Remaining to fully close Phase 1
- Validate the full bootstrap + smoke path in a clean environment with valid `FRED_API_KEY` and `TIINGO_API_KEY`.
- Add one short handoff verification run record (timestamp + outcome) after executing the clean-environment check.

### Dependencies
- Access to valid FRED and Tiingo API keys.
- Agreement on canonical asset naming conventions for portfolio weights.

## Phase 2 — Strengthen Quality Gates
Goal: reduce regression risk and improve confidence in iterative changes.

### Priorities
- Add backend API contract tests for response model shapes.
- Add frontend integration tests for API hooks and key dashboard rendering paths.
- Add one end-to-end happy path:
  - trigger refresh
  - verify data status
  - load overview
  - run portfolio optimizer

### Exit Criteria
- CI/local test workflow covers core backend contracts and primary frontend API flows.
- E2E happy path passes consistently on clean environment setup.
- Regressions in route contracts/components are caught by tests before merge.

### Dependencies
- Phase 1 schema stabilization.
- Test fixture strategy for data-dependent endpoints.

## Phase 3 — Production Readiness
Goal: make runtime and methodology resilient enough for more serious deployment/testing.

### Priorities
- Introduce production runtime defaults for backend/frontend containers.
- Improve persistence/runtime assumptions beyond prototype defaults where required.
- Reduce hardcoded expected-return assumptions in risk methodology.
- Add baseline observability expectations (refresh failures, endpoint latency, error rates).

### Exit Criteria
- Production-mode startup path is documented and validated.
- Monitoring/alerting minimums are documented and testable.
- Methodology assumptions are explicit, sourced where feasible, and versioned.

### Dependencies
- Stable API contracts and tests from Phases 1 and 2.
- Deployment target decision (local-only vs hosted environment).

## Ongoing Workstream: Documentation Hygiene
- Keep `README.md`, `docs/BUILD.md`, and module docs synchronized with code changes.
- Update `docs/KNOWN_GAPS.md` for every confirmed gap/fix.
- Require a handoff note and next explicit priority for each major work session.

## Related Docs
- `docs/ARCHITECTURE.md`
- `docs/HANDOFF_CHECKLIST.md`
- `docs/KNOWN_GAPS.md`
- `docs/RUNBOOKS.md`
