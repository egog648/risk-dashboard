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

### Progress Snapshot
- Completed: backend API contract test suite added with schema/field assertions for data status, yield curve, all-asset endpoints, and portfolio frontier.
- Completed: frontend integration test harness scaffolded (Vitest + Testing Library + MSW) with initial hook/component/page tests for overview, data-status bar, and optimizer flow.
- Completed: one Playwright e2e happy-path spec added for refresh -> status -> overview -> optimizer with deterministic optimizer assertion path.
- Completed: local green run record captured for backend smoke/contracts, frontend integration, and e2e happy path.

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

## Phase 4 — Advisory Practice Tools
Goal: systematize client portfolio building with Finesse Funds profiler, custom ticker registry, and advisor workflow.

### Progress Snapshot
- Completed: documentation reorg (`docs/README.md`, `docs/DOC_RULES.md`, `docs/sessions/`).
- Completed: Module 10 Finesse branding (design tokens, shared UI).
- Completed: Module 11 custom ticker registry (CRUD API, `/tickers` page, tests).
- Completed: Module 12 investment profiler (`/profiler`, scoring, advisor report shell).
- Completed: Module 13 profile → portfolio bridge (`mapToPortfolioWeights`, optimizer prefill).
- Completed: Module 14 client workspace (`/clients`, profiles, portfolios API).
- Completed: Module 15 advisor report with live market callouts (yield curve, risk scores, credit cycle, data-status).
- Completed: Module 16 registry-backed vehicle recommendations (`GET /tickers/recommend`, profiler summary integration).
- Deferred: Module 17 advanced analytics.

### Module Map
See `docs/BUILD.md` Part 2 (Modules 10–17).

### Exit Criteria
- Advisor can classify custom tickers (G/I/S) and manage a vehicle library.
- Client questionnaire produces portfolio weights analyzed against live market data.
- Advisor report combines profile, optimizer output, and market callouts.

### Dependencies
- Phase 1–2 stable foundation.
- Tiingo API for ticker validation.

## Ongoing Workstream: Documentation Hygiene
- Start at `docs/README.md` and follow `docs/DOC_RULES.md`.
- Keep `docs/BUILD.md` and active module doc synchronized with code.
- Append session notes to `docs/sessions/HANDOFF_NOTE.md`.

## Related Docs
- `docs/ARCHITECTURE.md`
- `docs/HANDOFF_CHECKLIST.md`
- `docs/KNOWN_GAPS.md`
- `docs/RUNBOOKS.md`
