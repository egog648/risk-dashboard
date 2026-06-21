# Roadmap

This roadmap moves the project from prototype to stable and handoff-friendly development.

## Current phase

**Phase 3 — Production Readiness** (active)

**Next single priority:** Module 17 Advanced Analytics (deferred) or low-priority gaps #8, #15, #16.

Phases 1, 2, and 4 are closed. Refactor Track and post-refactor enhancements are complete. CI enforces backend pytest, frontend Vitest, and `next build` on every push/PR to `main`.

---

## Phase 1 — Stabilize Correctness
Goal: make core API/UI behavior reliable under normal local usage.

**Status: Closed** (validated 2026-05-08; see `docs/sessions/HANDOFF_NOTE.md` Phase 1 Validation Record)

### Progress Snapshot
- Completed: portfolio weight schema alignment across frontend/backend/optimizer with legacy key compatibility mapping.
- Completed: standardized empty-data guards in asset services with degraded `200` responses and status metadata.
- Completed: backend API smoke tests for `/health`, `/api/v1/data-status`, refresh trigger, all-asset endpoints, and yield curve.
- Completed: deterministic first-run bootstrap sequence documented in build and runbook/checklist docs.
- Completed: clean-environment validation with valid API keys (2026-05-08).

### Exit Criteria
- Portfolio request/response uses one consistent allocation key set.
- Core endpoints return stable success or explicit actionable error responses.
- Smoke tests pass for health, status, all-asset endpoints, and yield curve.
- New contributor can boot and validate app using only docs.

---

## Phase 2 — Strengthen Quality Gates
Goal: reduce regression risk and improve confidence in iterative changes.

**Status: Closed** (CI workflow added; e2e in CI as of 2026-06-21)

### Progress Snapshot
- Completed: backend API contract test suite with schema/field assertions for data status, yield curve, all-asset endpoints, and portfolio frontier.
- Completed: frontend integration test harness (Vitest + Testing Library + MSW).
- Completed: Playwright e2e happy-path spec (refresh → status → overview → optimizer).
- Completed: local green run records for smoke/contracts, integration, and e2e.
- Completed: GitHub Actions CI (`.github/workflows/ci.yml`) — `backend-test`, `frontend-test`, `frontend-build`, `frontend-e2e` on push/PR to `main`.

### Remaining (deferred)
- Real frontier in e2e (optional; frontier mocked by design — see `KNOWN_GAPS.md` #14).

### Exit Criteria
- CI/local test workflow covers core backend contracts and primary frontend API flows.
- E2E happy path passes consistently on clean environment setup.
- Regressions in route contracts/components are caught by tests before merge.

---

## Phase 3 — Production Readiness
Goal: make runtime and methodology resilient enough for more serious deployment/testing.

**Status: Active**

### Priorities
1. ~~**Production Docker profile**~~ — **Done** (`docker-compose.prod.yml`; closes gap #3).
2. ~~**Integration tests**~~ — **Done** (`test_clients.py` + `/clients`, `/profiler`, `/tickers` Vitest; closes gap #13).
3. ~~**Observability**~~ — **Done** (refresh-run metrics on `/data-status`, slow-request warnings in `TimingMiddleware`).
4. ~~**Methodology hardening**~~ — **Done** (versioned `return_assumptions.yaml`, Shiller CAPE + Tiingo VNQ dividend yield, unified resolver; closes gap #5).
5. ~~**E2e in CI**~~ — **Done** (`frontend-e2e` job, dual-server Playwright config, stabilized happy-path spec; closes gap #14).

### Exit Criteria
- Production-mode startup path is documented and validated.
- Monitoring/alerting minimums are documented and testable.
- Methodology assumptions are explicit, sourced where feasible, and versioned.

### Dependencies
- Stable API contracts and tests from Phases 1 and 2.
- Deployment target decision (local-only vs hosted environment).

---

## Phase 4 — Advisory Practice Tools
Goal: systematize client portfolio building with Finesse Funds profiler, custom ticker registry, and advisor workflow.

**Status: Feature-complete** (Module 17 deferred)

### Progress Snapshot
- Completed: documentation reorg (`docs/README.md`, `docs/DOC_RULES.md`, `docs/sessions/`).
- Completed: Module 10 Finesse branding (design tokens, shared UI).
- Completed: Module 11 custom ticker registry (CRUD API, `/tickers` page, tests).
- Completed: Module 12 investment profiler (`/profiler`, scoring, advisor report shell).
- Completed: Module 13 profile → portfolio bridge (`mapToPortfolioWeights`, `mapProfileToPortfolioWeights`, optimizer prefill).
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

---

## Refactor Track (Phase 2 → 3 bridge)

**Status: Completed** (2026-06-21)

Goal: reduce dead code, unify duplicated logic, and improve fetch efficiency without breaking API contracts.

Control doc (historical): [`docs/REFACTOR_CHECKLIST.md`](REFACTOR_CHECKLIST.md)

| Wave | Focus | Status |
|------|-------|--------|
| 0 | Docs + baseline | Completed |
| 1 | Cleanup + bug fix | Completed |
| 2 | Structural dedup | Completed |
| 3 | Performance | Completed |

Final validation (2026-06-21): backend pytest green, frontend vitest green, build success. Gaps #9–#12 closed in `KNOWN_GAPS.md`.

---

## Post-Refactor Enhancements

**Status: Completed** (2026-06-21)

Not a separate roadmap phase — incremental improvements after refactor close-out:

- **Performance pass** (`ebcc675`): `include_history=false` default, response cache (10-min TTL), `ClientShell` split, route skeletons, lazy Recharts, on-demand optimizer on bare `/portfolio`. Record: [`docs/sessions/PERFORMANCE_BASELINE.md`](sessions/PERFORMANCE_BASELINE.md).
- **Portfolio workflow** (`5afefc1`): `PortfolioSelector`, `PortfolioComparisonPanel`, `FrontierComputeRequest` with `suggested_weights`, client profile prefill via `mapProfileToPortfolioWeights`.

---

## Ongoing Workstream: Documentation Hygiene
- Start at `docs/README.md` and follow `docs/DOC_RULES.md`.
- Keep `docs/BUILD.md` and active module doc synchronized with code.
- Append session notes to `docs/sessions/HANDOFF_NOTE.md` (log only — `ROADMAP.md` is authoritative for phase status).

## Related Docs
- `docs/ARCHITECTURE.md`
- `docs/HANDOFF_CHECKLIST.md`
- `docs/KNOWN_GAPS.md`
- `docs/RUNBOOKS.md`
