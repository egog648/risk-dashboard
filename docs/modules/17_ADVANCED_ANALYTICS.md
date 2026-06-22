# Module 17 — Advanced Analytics

## Goal
Extend portfolio analysis with governor-aware constraints, income adequacy checks, and historical stress scenarios.

## Status: Done (2026-06-21)

## Implemented

### Governor-aware optimization
- `OptimizationConstraintsPayload` on `POST /api/v1/portfolio/frontier`
- Min cash floor from `governor_cap_pct` (same rules as profile→weights mapping)
- Max portfolio vol: `0.06 + (governor_cap_pct / 100) × 0.14`
- Constraint warnings on response when current/suggested exceed cap
- Frontend: governor badge on `/portfolio`, vol highlighting in `FrontierControls`

### Income adequacy
- Portfolio fields: `portfolio_value_usd`, `annual_income_need_usd`, `annual_income_need_pct`
- `backend/app/services/risk/income_analysis.py` — macro proxy yields per bucket
- `IncomeAdequacyPanel` in advisor report when data available
- Edit form on `/clients/[id]/portfolios/[pid]`

### Stress scenarios
- `backend/app/services/risk/stress.py` — buy-and-hold replay for GFC, COVID, rate shock
- Q6 tolerance: A=0%, B=10%, C=15%, D=25%
- `StressPanel` on `/portfolio` and condensed in advisor report

## Files

| Layer | Path |
|-------|------|
| Constraints | `backend/app/services/profiler/constraints.py`, `frontend/lib/profiler/constraints.ts` |
| Frontier | `backend/app/services/risk/efficient_frontier.py` |
| Income | `backend/app/services/risk/income_analysis.py` |
| Stress | `backend/app/services/risk/stress.py` |
| API | `backend/app/api/v1/endpoints/portfolio_analytics.py` |
| UI | `frontend/components/portfolio/StressPanel.tsx`, `frontend/components/profiler/IncomeAdequacyPanel.tsx` |

## Verify

```bash
# Backend
cd backend && pytest tests/test_constraints.py tests/test_frontier_constraints.py tests/test_income_analysis.py tests/test_stress.py tests/test_clients.py -q

# Frontend
cd frontend && npm run test

# Manual
# 1. Save profile with Q11=A (low cap) → open /portfolio?clientId=&portfolioId=
# 2. Confirm governor badge and min-cash constraint on frontier request
# 3. Set portfolio value + income need on portfolio detail page
# 4. Confirm income gap and stress table on optimizer + report
```

## Depends On

- Module 13, Module 15

## See Also

- `docs/METHODOLOGY.md` — Module 17 constraint, income, and stress sections
- `docs/ROADMAP.md`
