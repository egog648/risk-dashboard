# Refactor Checklist — Completed (Historical Record)

**Status: Completed — historical record only.** Do not use this doc for current phase status; see [`ROADMAP.md`](ROADMAP.md) and [`KNOWN_GAPS.md`](KNOWN_GAPS.md).

Single source of truth for the three-wave refactor (cleanup → structural dedup → performance), closed 2026-06-21.

## Non-negotiable contracts

These must not change without explicit doc + contract test updates:

| Contract | Lock |
|----------|------|
| `GET /api/v1/{equities,credit,hard-assets,cash}/all` | `AssetClassMetrics` shape: `data_status`, `missing_series`, `history`, risk fields |
| `POST /api/v1/portfolio/frontier` | Keys: `frontier`, `max_sharpe`, `min_vol`, `current`, `monte_carlo`, `correlation_matrix`; optional `suggested` |
| Portfolio weight keys | `backend/app/models/schemas.py` ↔ `frontend/types/portfolio.ts` |
| Profiler save flow | Save profile → redirect to `/clients/{id}` |
| Degraded empty data | `200` + `data_status: "unavailable"` when ticker missing |

## Baseline commands

```bash
cd backend && pytest tests/
cd frontend && npm run test
cd frontend && npm run test:e2e
cd frontend && npm run build
```

## Baseline record

| Field | Value |
|-------|-------|
| Pre-refactor date | 2026-06-21 |
| Pre-refactor commit | `2aa4a68c4b007d9c5ceaaa686cc2084f0d0f6ede` |
| Pre-refactor backend | 34 passed |
| Pre-refactor frontend | 8 files, 32 passed |
| Close-out date | 2026-06-21 (doc SSOT reconciliation) |
| Close-out backend | 38 passed |
| Close-out frontend | 10 files, 40 passed |
| Close-out build | success (13 routes) |

## Rollback rule

If any contract test fails after a wave, revert the entire wave. Do not patch forward.

---

## Phase 0 — Documentation

- [x] Create this checklist
- [x] Update `KNOWN_GAPS.md` with refactor gap entries
- [x] Update `ROADMAP.md` with Refactor Track
- [x] Append baseline record to `sessions/HANDOFF_NOTE.md`
- [x] Capture baseline test counts

---

## Wave 1 — Dead code cleanup and bug fix

### Wave 1 checklist

- [x] Grep each symbol before delete
- [x] Code changes complete
- [x] `pytest tests/` green
- [x] `npm run test` + `npm run build` green
- [x] Portfolio test asserts FrontierControls labels
- [x] Close profiler cache gap in `KNOWN_GAPS.md`
- [x] Handoff note appended

### Manual smoke (Wave 1)

- [x] Overview loads 4 asset sections
- [x] `/portfolio` shows chart + FrontierControls + correlation matrix
- [x] `/profiler` save → `/clients/{id}` shows fresh profile without hard refresh
- [x] `/profiler/summary` advisor report renders

---

## Wave 2 — Structural dedup

### Wave 2 checklist

- [x] Module docs updated before code
- [x] Code changes complete
- [x] Full test suite green
- [x] Manual route smoke (HANDOFF_CHECKLIST sections 3.5–5)
- [x] Handoff note appended

---

## Wave 3 — Performance

### Wave 3 checklist

- [x] Module docs updated before code
- [x] Code changes complete
- [x] Full automated suite green
- [x] `POST /data-status/refresh` succeeds
- [x] Close performance gaps in `KNOWN_GAPS.md`
- [x] Final handoff record

---

## Post-refactor enhancements (outside waves)

Commits after Wave 3 close-out; documented in `ROADMAP.md` Post-Refactor Enhancements section.

| Commit | Summary | Docs synced |
|--------|---------|-------------|
| `ebcc675` | Performance pass: `include_history`, response cache, ClientShell, loading skeletons, lazy charts | `ARCHITECTURE.md`, `BUILD.md`, `PERFORMANCE_BASELINE.md` |
| `5afefc1` | Portfolio selector, comparison panel, `FrontierComputeRequest`, profile prefill | `modules/08`, `BUILD.md`, `ARCHITECTURE.md` |

- [x] BUILD.md API table updated
- [x] modules/08 and modules/14 synced
- [x] ARCHITECTURE.md updated
- [x] ROADMAP.md post-refactor section added
- [x] REFACTOR_CHECKLIST marked historical

## Explicitly NOT changing

- Route URLs and HTTP methods
- `PortfolioWeights` key set
- Degraded `200` behavior
- Docker/dev runtime profiles (Phase 3 scope)
- Custom ticker registry / recommend API contracts
