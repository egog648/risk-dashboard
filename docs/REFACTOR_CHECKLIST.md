# Refactor Checklist — Documentation-First, Zero-Breakage

Single source of truth for the three-wave refactor (cleanup → structural dedup → performance).

**Rule:** No application code changes until this doc exists and baseline tests are recorded below.

## Non-negotiable contracts

These must not change without explicit doc + contract test updates:

| Contract | Lock |
|----------|------|
| `GET /api/v1/{equities,credit,hard-assets,cash}/all` | `AssetClassMetrics` shape: `data_status`, `missing_series`, `history`, risk fields |
| `POST /api/v1/portfolio/frontier` | Keys: `frontier`, `max_sharpe`, `min_vol`, `current`, `monte_carlo`, `correlation_matrix` |
| Portfolio weight keys | `backend/app/models/schemas.py` ↔ `frontend/types/portfolio.ts` |
| Profiler save flow | Save profile → redirect to `/clients/{id}` |
| Degraded empty data | `200` + `data_status: "unavailable"` when ticker missing |

## Baseline commands

Run before Wave 1 and after each wave:

```bash
cd backend && pytest tests/
cd frontend && npm run test
cd frontend && npm run test:e2e
cd frontend && npm run build
```

## Baseline record

| Field | Value |
|-------|-------|
| Date | 2026-06-21 |
| Commit SHA | `2aa4a68c4b007d9c5ceaaa686cc2084f0d0f6ede` (pre-refactor) |
| Backend pytest | 34 passed |
| Frontend vitest | 8 files, 32 passed |
| Frontend e2e | Requires backend at `:8000`; failed without running backend (expected) |
| Frontend build | Success (13 routes) |

### Post-refactor validation (2026-06-21)
- Backend pytest: **35 passed**
- Frontend vitest: **32 passed**
- Frontend build: **success**

## Rollback rule

If any contract test fails after a wave, revert the entire wave. Do not patch forward.

---

## Phase 0 — Documentation

- [x] Create this checklist
- [ ] Update `KNOWN_GAPS.md` with refactor gap entries
- [ ] Update `ROADMAP.md` with Refactor Track
- [ ] Append baseline record to `sessions/HANDOFF_NOTE.md`
- [ ] Capture baseline test counts above

---

## Wave 1 — Dead code cleanup and bug fix

**Doc-first:** Check items below before deleting code.

### Scope table

| Action | Target |
|--------|--------|
| Delete file | `frontend/hooks/useMarketData.ts` |
| Delete file | `frontend/hooks/useCycleData.ts` |
| Clean | `frontend/app/page.tsx` — dead import, use `ASSET_CLASS_GROUPS` |
| Remove exports | Granular fetchers in `lib/api/{equities,credit,hardAssets,cash}.ts` |
| Remove exports | `fmtRiskScore`, `fmtDate`, `fmtValuation` in `formatters.ts` |
| Remove export | `mapScoresToPortfolioWeights` in `mapToPortfolioWeights.ts` |
| Fix | `ProfilerContext.tsx` — use `useSaveClientProfile` for cache invalidation |
| Wire | `FrontierControls` on `app/portfolio/page.tsx` |
| Remove | `correlation_matrix`, `ewma_covariance` in `metrics.py` |
| Remove imports | `efficient_frontier.py`, `profiler/mapping.py` |
| Remove | dead `dgs10` fetch in `reits.py`; duplicate locals in reits/gold |
| Update docs | `modules/07_COMPONENTS.md`, `modules/08_PORTFOLIO_OPTIMIZER.md` |

### Wave 1 checklist

- [ ] Grep each symbol before delete
- [ ] Code changes complete
- [ ] `pytest tests/` green
- [ ] `npm run test` + `npm run test:e2e` + `npm run build` green
- [ ] Portfolio test asserts FrontierControls labels
- [ ] Close profiler cache gap in `KNOWN_GAPS.md`
- [ ] Handoff note appended

### Manual smoke (Wave 1)

- [ ] Overview loads 4 asset sections
- [ ] `/portfolio` shows chart + FrontierControls + correlation matrix
- [ ] `/profiler` save → `/clients/{id}` shows fresh profile without hard refresh
- [ ] `/profiler/summary` advisor report renders

---

## Wave 2 — Structural dedup

**Doc-first:** Update `modules/04_ASSET_CLASSES.md` and `modules/09_EXTENDING.md` before refactoring subclasses.

### Scope table

| Action | Target |
|--------|--------|
| Extend | `AssetClassBase`: `get_cpi_yoy`, `get_risk_free`, `build_risk_metrics` |
| Refactor | All 9 asset class subclasses |
| New module | `backend/app/services/risk/expected_returns.py` |
| New hook | `frontend/hooks/useAdvisorReport.ts` |
| Refactor | `ProfilerSummaryPanel`, `ProfilerPrintDocument` |
| Unify types | `SleeveAllocation`, `VehicleSuggestion` → `types/clients.ts` |
| New API | `frontend/lib/api/dataStatus.ts`; unify `staleTime` (60s) |
| Refactor | `app/page.tsx` iterate `ASSET_CLASS_GROUPS` |
| Update docs | 04, 09, 12, 13, `ARCHITECTURE.md` |

### Wave 2 checklist

- [ ] Module docs updated before code
- [ ] Code changes complete
- [ ] Full test suite green
- [ ] Manual route smoke (HANDOFF_CHECKLIST sections 3.5–5)
- [ ] Handoff note appended

---

## Wave 3 — Performance

**Doc-first:** Update `modules/03_DATA_LAYER.md` and `ARCHITECTURE.md` before implementation.

### Scope table

| Action | Target |
|--------|--------|
| New | `data_fetchers/cache.py` — request-scoped memoization |
| Align | Portfolio returns method with `compute_returns` (log returns) |
| Refactor | `build_frontier` returns precomputed `mu`/`cov` |
| Incremental upsert | `fred_client.py`, `yfinance_client.py` |
| Remove refresh | FRED: `DCOILWTICO`, `CSUSHPISA`, `SOFR`; Tiingo: `IEF` |
| Parallel refresh | `data_manager.py` (concurrency cap: 4) |
| N+1 fix | `workspace.list_clients` |
| Update docs | 03, ARCHITECTURE, METHODOLOGY, FRED_SERIES |

### Wave 3 checklist

- [ ] Module docs updated before code
- [ ] Code changes complete
- [ ] Full automated suite green
- [ ] `POST /data-status/refresh` succeeds
- [ ] Close performance gaps in `KNOWN_GAPS.md`
- [ ] Final handoff record

---

## Doc update inventory

| Code area | Docs |
|-----------|------|
| Dead code / FrontierControls | `modules/07`, `modules/08` |
| Asset class pipeline | `modules/04`, `modules/09` |
| Risk engine | `modules/05` |
| FRED/ticker removal | `reference/FRED_SERIES.md`, `modules/03` |
| Profiler dedup | `modules/12`, `modules/13` |
| Caching / performance | `ARCHITECTURE.md`, `METHODOLOGY.md` |

## Explicitly NOT changing

- Route URLs and HTTP methods
- `PortfolioWeights` key set
- Degraded `200` behavior
- Docker/dev runtime profiles
- Custom ticker registry / recommend API contracts
