# Module 17 — Advanced Analytics (Deferred)

## Goal
Extend portfolio analysis with governor-aware constraints, income adequacy checks, and historical stress scenarios.

## Scope (Phase 2b — not started)

### Governor-aware optimization
- Max portfolio vol derived from governor cap
- Minimum cash floor when emergency fund inadequate
- Pass constraints into `efficient_frontier.py`

### Income adequacy
- Client annual income need ($ or %)
- Portfolio yield estimate from asset metrics
- Gap analysis in advisor report

### Stress scenarios
- Map Q6 max tolerable decline to scenario replay
- Show portfolio drawdown in 2008, 2020, rate-shock windows

## Files Involved (when implemented)

- `backend/app/services/risk/stress.py`
- `backend/app/services/risk/income_analysis.py`
- `frontend/components/portfolio/StressPanel.tsx`

## Depends On

- Module 13, Module 15

## Exit Criteria

- Document only until Modules 10–16 are complete and in use.

## See Also

- `docs/ROADMAP.md` — Phase 4 advisory tools
