# Handoff Note — Phase 1 Session

## Completed in this session
- Aligned portfolio weight schema to split corporate credit keys with legacy compatibility.
- Added defensive empty-data handling in asset services with degraded `200` responses.
- Added backend API smoke tests for core `/api/v1/*` and `/health`.
- Synchronized first-run bootstrap instructions across build/checklist/runbooks.
- Updated roadmap and known-gaps tracking to reflect current status.

## Next single priority
Run a clean-environment validation with valid `FRED_API_KEY` and `TIINGO_API_KEY`, execute `pytest backend/tests/test_api_smoke.py`, and record the results in docs as final Phase 1 exit evidence.

## Phase 1 Validation Record

- **Date/Time:** 2026-05-08 (local)
- **Environment:** Local backend (uvicorn), Windows PowerShell
- **Health check:** `GET /health` → `200 OK`, body `{"status":"ok"}`
- **Data status:** `GET /api/v1/data-status` → `200 OK` (valid payload returned)
- **Smoke tests:** `pytest tests/test_api_smoke.py` → `8 passed`
- **Result:** Phase 1 verification sequence completed successfully.

### Notes
- PowerShell `curl` maps to `Invoke-WebRequest`; use `Invoke-RestMethod` or `curl.exe` for `-X` style calls.
- Current run includes deprecation warnings for `datetime.utcnow()` (non-blocking; follow-up hardening item).

---

# Handoff Note — Phase 2 Session (Quality Gates)

## Completed in this session
- Added backend contract tests in `backend/tests/test_api_contracts.py` with schema-level assertions for:
  - `GET /api/v1/data-status`
  - `POST /api/v1/data-status/refresh`
  - `GET /api/v1/{equities|credit|hard-assets|cash}/all`
  - `GET /api/v1/credit/yield-curve`
  - `POST /api/v1/portfolio/frontier`
- Added backend shared fixtures in `backend/tests/conftest.py` for deterministic app/client setup.
- Added frontend integration test harness:
  - Vitest config/setup (`frontend/vitest.config.ts`, `frontend/vitest.setup.ts`)
  - MSW mocks/fixtures (`frontend/tests/mocks/*`)
  - Query test utils (`frontend/tests/utils/renderWithProviders.tsx`)
  - Initial hook/component/page tests (`frontend/tests/hooks/*`, `frontend/tests/components/*`, `frontend/tests/pages/*`)
- Added one Playwright e2e happy-path test in `frontend/e2e/happy-path.spec.ts` and config in `frontend/playwright.config.ts`.
- Updated Phase 2 tracking docs (`docs/ROADMAP.md`, `docs/KNOWN_GAPS.md`, `docs/RUNBOOKS.md`).

## Validation record (this session)
- **Backend contracts:** `cd backend && pytest tests/test_api_contracts.py` -> `8 passed`
- **Backend smoke:** `cd backend && pytest tests/test_api_smoke.py` -> `8 passed`
- **Frontend integration:** `cd frontend && npm run test` -> `5 files passed, 10 tests passed`
- **Frontend e2e:** `cd frontend && npm run test:e2e -- --reporter=line` -> `1 passed` after making optimizer step deterministic for browser runtime by routing only `/api/v1/portfolio/frontier` to a stable in-test fixture response.

## Next single priority
Start Phase 3 planning with production-runtime hardening scope (non-dev container defaults and release-oriented run profile), using the now-green Phase 2 quality gate baseline.

---

# Handoff Note — Phase 4 Session (Doc Reorg + Advisory Expansion)

## Completed in this session
- Reorganized documentation: `docs/README.md`, `docs/DOC_RULES.md`, `docs/sessions/`, `docs/reference/FRED_SERIES.md`.
- Extended `docs/BUILD.md` with Part 2 (Modules 10–17).
- Added module build guides 10–17 for Finesse Funds advisory expansion.
- Updated `ARCHITECTURE.md` (advisory practice section), `ROADMAP.md` (Phase 4), `KNOWN_GAPS.md`.
- Implemented Module 10 Finesse branding tokens and shared UI primitives.
- Implemented Module 11 custom ticker registry (backend CRUD, `/tickers` page, tests).

## Next single priority
Implement Module 12 (Investment Profiler) — port `Finesse_Funds_Investment_Profiler (2).html` questionnaire into Next.js at `/profiler`.

---

# Handoff Note — Production Build + Module 16 Session

## Completed in this session
- Fixed Next.js production build by wrapping `/portfolio` `useSearchParams()` usage in a Suspense boundary.
- Added `backend/app/services/tickers/recommendations.py` with cosine-similarity scoring and objective/aggression boosts.
- Added `GET /api/v1/tickers/recommend` endpoint and `backend/tests/test_ticker_recommendations.py`.
- Added `frontend/hooks/useTickerRecommendations.ts` and `frontend/components/profiler/VehicleSuggestions.tsx`.
- Integrated registry-backed vehicle tables into `AdvisorReport` with static fallback when registry is empty.
- Synchronized `docs/BUILD.md`, `docs/ROADMAP.md`, and `docs/KNOWN_GAPS.md` with current module status.

## Validation record (this session)
- **Date/Time:** 2026-06-21 (local)
- **Production build:** `cd frontend && npm run build` → success (13 static routes)
- **Backend recommendations:** `pytest tests/test_ticker_recommendations.py tests/test_ticker_registry.py` → `10 passed`
- **Frontend integration:** `cd frontend && npm run test` → `6 files, 22 tests passed`
- **Recommend endpoint:** `GET /api/v1/tickers/recommend?growth_pct=15&income_pct=65&safety_pct=20&aggression=55&asset_class=equities` → ranked registry tickers with scores

## Next single priority
Implement Module 15 market callouts — wire live data-status, yield curve, and asset risk scores into the advisor report narrative.

---

# Handoff Note — Module 15 Market Callouts Session

## Completed in this session
- Added `frontend/lib/reports/buildMarketCallouts.ts` with five profile-aware rules (inverted yield curve, elevated small-cap risk, wide HY spreads, credit contraction, stale data notice).
- Added `frontend/hooks/useMarketCalloutsData.ts` aggregating equities, credit, yield-curve, and data-status queries.
- Added `frontend/components/profiler/MarketCallouts.tsx` and wired into `AdvisorReport` between narrative and vehicle sleeves (print included).
- Extended `frontend/types/assets.ts` with `DataStatusResponse` and full `YieldCurveResponse` fields.
- Added unit tests (`buildMarketCallouts.test.ts`), component test (`MarketCallouts.test.tsx`), and MSW yield-curve handler.
- Marked Module 15 Done in `docs/BUILD.md` and `docs/ROADMAP.md`.

## Validation record (this session)
- **Date/Time:** 2026-06-21 (local)
- **Frontend unit/integration:** `cd frontend && npm run test` → `8 files, 32 tests passed`
- **Production build:** `cd frontend && npm run build` → success (13 routes)
- **Backend contracts:** `cd backend && pytest tests/test_api_smoke.py tests/test_api_contracts.py` → `16 passed`

## Next single priority
Phase 4 advisory modules are feature-complete (Module 17 deferred). Begin Phase 3 production-readiness planning (prod Docker profiles, observability, methodology hardening) or pick up Module 17 when analytics scope is defined.

---

# Handoff Note — Refactor Track Phase 0 (Baseline)

## Completed in this session
- Created `docs/REFACTOR_CHECKLIST.md` as refactor control doc.
- Updated `docs/KNOWN_GAPS.md` with gaps 9–12 (profiler cache, duplicate expected returns, redundant fetches, returns inconsistency).
- Updated `docs/ROADMAP.md` with Refactor Track (Waves 0–3).

## Baseline record (pre-refactor code)
- **Date/Time:** 2026-06-21 (local)
- **Commit SHA:** `2aa4a68c4b007d9c5ceaaa686cc2084f0d0f6ede`
- **Backend:** `pytest tests/` → 34 passed
- **Frontend vitest:** 8 files, 32 passed
- **Frontend build:** success (13 routes)
- **Frontend e2e:** requires backend at `:8000`; not run green in this session (backend not started)

## Next single priority
Execute Wave 1: dead code cleanup, profiler cache fix, wire FrontierControls.

---

# Handoff Note — Refactor Wave 1

## Completed
- Removed dead hooks (`useMarketData`, `useCycleData`) and unused API/formatters exports.
- Fixed profiler save cache invalidation via `useSaveClientProfileMutation`.
- Wired `FrontierControls` on portfolio page; extended portfolio test.
- Backend: removed unused `correlation_matrix`/`ewma_covariance`, dead REIT fetch, duplicate locals.
- Updated module docs 05, 07, 08; closed KNOWN_GAPS #9.

## Validation
- Backend pytest: 34 passed
- Frontend vitest: 32 passed; build success

## Next single priority
Execute Wave 2: AssetClassBase pipeline, expected_returns module, profiler dedup.

---

# Handoff Note — Refactor Waves 2–3 Complete

## Completed
- **Wave 2:** Extended `AssetClassBase` with shared risk pipeline; refactored all 9 asset classes; added `expected_returns.py`; `useAdvisorReport` hook; unified types and `dataStatus` API; updated docs 03, 04, ARCHITECTURE.
- **Wave 3:** Request-scoped cache middleware; incremental TimeSeries upserts; parallel refresh (concurrency 4); removed unused FRED/ticker refresh targets; client list N+1 fix; portfolio returns consistency via shared `mu`/`cov`; closed KNOWN_GAPS #10–12.

## Validation record
- **Date/Time:** 2026-06-21 (local)
- **Backend pytest:** 35 passed
- **Frontend vitest:** 32 passed
- **Frontend build:** success (13 routes)

## Next single priority
Resume Phase 3 production-readiness planning (prod Docker profiles, observability) on the refactored baseline.

---

# Handoff Note — Doc SSOT Reconciliation and Gap Discovery

## Completed
- Added conflict resolution rules to `docs/DOC_RULES.md`; extended `docs/README.md` doc map with `REFACTOR_CHECKLIST.md` and `PERFORMANCE_BASELINE.md`.
- Synced `docs/BUILD.md` API reference (clients endpoints, `include_history`, `FrontierComputeRequest`, `high_detail`).
- Updated `docs/modules/08_PORTFOLIO_OPTIMIZER.md` and `docs/modules/14_CLIENT_WORKSPACE.md` to match committed code.
- Updated `docs/ARCHITECTURE.md` (caching layers, TimingMiddleware, ClientShell, clients workspace, portfolio workflow).
- Reconciled `docs/ROADMAP.md`: closed Phase 1, marked Refactor Track + post-refactor enhancements complete, set Phase 3 active.
- Reconciled `docs/KNOWN_GAPS.md` with verified gaps (#3–#5, #8, #13–#16); closed doc drift (#6).
- Closed out `docs/REFACTOR_CHECKLIST.md` as historical record.
- Updated `docs/HANDOFF_CHECKLIST.md` portfolio smoke step (on-demand optimizer).
- Updated `docs/RUNBOOKS.md` with validated test counts.
- Fixed MSW handler type error in `frontend/tests/mocks/handlers.ts` (unblocked `next build` type-check).

## Validation record (2026-06-21)
- **Backend pytest:** `pytest tests/` → **38 passed** (40 deprecation warnings, non-blocking)
- **Frontend vitest:** `npm run test` → **10 files, 40 passed**
- **Frontend build:** `npm run build` → **success (13 routes)**
- **Frontend e2e:** `npm run test:e2e` → **1 failed** (overview heading not visible within 15s; backend was reachable)
- **API surface:** BUILD.md API table aligned with `backend/app/api/v1/router.py` endpoint groups

## Verified open gaps (see KNOWN_GAPS.md)
- No CI ( #4 ) — **next priority**
- Prod Docker compose defaults to dev (#3)
- Clients/profiler/tickers test coverage (#13)
- Hardcoded expected returns (#5)
- E2e stability (#14)

## Next single priority
Add GitHub Actions CI workflow to enforce backend pytest, frontend Vitest, and `next build` on every push/PR.

---

# Handoff Note — GitHub Actions CI

## Completed
- Added `.github/workflows/ci.yml` with parallel jobs: `backend-test`, `frontend-test`, `frontend-build`.
- Updated `docs/RUNBOOKS.md` (CI section), `docs/ROADMAP.md` (Phase 2 closed), `docs/KNOWN_GAPS.md` (#4 partially resolved), `docs/HANDOFF_CHECKLIST.md` (pre-merge CI gate).

## CI validation record
- **Workflow:** `CI` on push/PR to `main`
- **Jobs:** backend pytest, frontend Vitest, frontend build (no API secrets; e2e deferred)
- **First green run:** https://github.com/egog648/risk-dashboard/actions/runs/27917989719 (all 3 jobs passed)

## Next single priority
Wire production Docker profile into compose (`KNOWN_GAPS.md` #3).

---

# Handoff Note — Production Docker Compose Profile

## Completed
- Added `docker-compose.prod.yml` with `production` Dockerfile targets, data-only backend volume, and prod env vars.
- Added `INTERNAL_API_URL` fallback in `frontend/lib/api/server.ts` for SSR inside containers.
- Added `NEXT_PUBLIC_API_URL` build ARG/ENV to `frontend/Dockerfile` production stage.
- Updated docs: `01_DOCKER_SETUP.md`, `RUNBOOKS.md`, `HANDOFF_CHECKLIST.md`, `README.md`, `ROADMAP.md`, `KNOWN_GAPS.md` (#3 closed), `ARCHITECTURE.md`.

## Validation record (2026-06-21)
- **Command:** `docker compose -f docker-compose.prod.yml up --build -d`
- **Build:** backend + frontend production images built successfully
- **Health:** `GET /health` → `{"status":"ok"}`
- **Refresh:** `POST /api/v1/data-status/refresh` → 200
- **Data status:** `overall_status=stale` (not error)
- **Smoke endpoints:** equities, credit, yield-curve, hard-assets, cash → all 200
- **Frontend:** prod container served overview at `:3001` (host `:3000` occupied by local dev server); HTTP 200, no SSR fetch errors in logs
- **Compose config:** `docker-compose.yml` and `docker-compose.prod.yml` both validate
- **Note:** Full dev stack startup not re-run on `:3000` due to port conflict with existing local `node` process; dev compose file unchanged

## Next single priority
Integration tests for clients/profiler/tickers surfaces (`KNOWN_GAPS.md` #13).

---

# Handoff Note — Advisory Integration Tests (Gap #13)

## Completed
- Added `backend/tests/test_clients.py` — client CRUD, profile save, portfolio/outline workflow, override, and error cases (7 tests).
- Extended MSW handlers with mutable advisory mock state (`POST /clients`, `POST /clients/:id/profiles`, `GET/POST /tickers`).
- Added frontend page tests: `clients.test.tsx`, `profiler.test.tsx`, `tickers.test.tsx`.
- Updated `vitest.setup.ts` to reset advisory mock state between tests.
- Closed `KNOWN_GAPS.md` #13; updated `ROADMAP.md` next priority to observability.

## Validation record (2026-06-21)
- **Backend pytest:** `pytest tests/` → **45 passed**
- **Frontend vitest:** `npm run test` → **13 files, 47 passed**
- **New backend tests:** 7 (`test_clients.py`)
- **New frontend tests:** 7 (2 clients + 3 profiler + 2 tickers)

## Next single priority
Extend `TimingMiddleware` with refresh-failure tracking and documented thresholds (Phase 3 observability).

---

# Handoff Note — Phase 3 Observability

## Completed
- Added `backend/app/core/observability.py` — thread-safe refresh-run metrics (`begin/record/complete/fail`).
- Extended `RefreshRunSummary` schema and `DataStatusResponse.last_refresh_run`.
- Instrumented `refresh_all_data()` with per-series ok/error aggregation and WARNING logs.
- Extended `TimingMiddleware` with slow-request WARNING + `X-Slow-Request` header.
- Added config thresholds: `SLOW_REQUEST_THRESHOLD_MS` (2000), `REFRESH_ERROR_WARN_RATIO` (0.25).
- Added `backend/tests/test_observability.py` (4 tests); updated contract test for `last_refresh_run`.
- Synced frontend `RefreshRunSummary` type and MSW fixture.
- Documented observability in `RUNBOOKS.md`, `ARCHITECTURE.md`, `PERFORMANCE_BASELINE.md`.

## Validation record (2026-06-21)
- **Backend pytest:** `pytest tests/` → **49 passed**
- **Frontend vitest:** `npm run test` → **13 files, 47 passed**
- **New backend tests:** 4 (`test_observability.py`)

## Next single priority
Methodology hardening — replace hardcoded expected-return constants with sourced/versioned assumptions (`KNOWN_GAPS.md` #5).

---

# Handoff Note — Methodology Hardening (Gap #5)

## Completed
- Added `backend/app/data/return_assumptions.yaml` and `return_assumptions.py` — versioned registry with source citations and fallbacks (`2026-06-21.1`).
- Added `shiller_client.py` + `shiller_parser.py` — live Yale Shiller CAPE for large-cap earnings yield (`1 / CAPE`).
- Extended Tiingo client with `fetch_trailing_dividend_yield()` for VNQ REIT dividend yield.
- Refactored `expected_returns.py` — unified `resolve_return_inputs`, `compute_expected_return`, `build_asset_class_expected_return`.
- Updated all 9 asset classes to use shared resolver (eliminates optimizer/card drift).
- Parameterized `fundamental_scoring.py` coefficients via registry.
- Exposed `assumptions_version` / `assumptions_as_of` on `DataStatusResponse`.
- Registered Shiller CAPE in daily data refresh (`data_manager.py`).
- Added `backend/tests/test_return_assumptions.py` (8 tests).
- Closed `KNOWN_GAPS.md` #5; updated `METHODOLOGY.md`, `ROADMAP.md`, `05_RISK_ENGINE.md`, `FRED_SERIES.md`.

## Validation record (2026-06-21)
- **Backend pytest:** `pytest tests/` → **57 passed**
- **New backend tests:** 8 (`test_return_assumptions.py`)

## Next single priority
E2e in CI — see handoff note below (completed 2026-06-21).

---

# Handoff Note — E2E in CI (Gap #14)

## Completed
- Stabilized `frontend/e2e/happy-path.spec.ts`: backend health wait, data-status poll, stable `data-testid` selectors, portfolio `networkidle` hydration wait, mocked frontier route.
- Dual-server Playwright config in `frontend/playwright.config.ts` (uvicorn + Next dev; `global-setup.ts` runs `init_db()`).
- Browser API calls use Next.js rewrite proxy (`/api/backend/*`) via `frontend/lib/api/client.ts` to avoid CORS during e2e.
- Added `frontend-e2e` job to `.github/workflows/ci.yml` (15 min timeout, Playwright Chromium install, failure artifacts).
- Simplified `frontend/app/page.tsx` to client-rendered overview (avoids HydrationBoundary SSR serialization error).
- Closed `KNOWN_GAPS.md` #14; updated `RUNBOOKS.md`, `ROADMAP.md` Phase 3 priority #5.

## Validation record (2026-06-21)
- **Frontend e2e (local):** `CI=true npm run test:e2e` → **1 passed** (~20–30s; Playwright-managed servers on `:8000`/`:3000` or custom `E2E_*_PORT`)
- **Frontend vitest:** `npm run test` → **47 passed** (after client proxy change)
- **CI `frontend-e2e`:** requires `FRED_API_KEY` + `TIINGO_API_KEY` GitHub Actions secrets — verify first green run after secrets are configured

## Intentional deferrals
- Real frontier in e2e (frontier POST remains mocked for determinism)
- Seeded SQLite for fork PRs without secrets

## Next single priority
Module 17 Advanced Analytics (deferred) or low-priority gaps #8, #15, #16.
