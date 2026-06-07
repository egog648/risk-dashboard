# Module 13 — Profile to Portfolio Bridge

## Goal
Map profiler outputs (G/I/S triangle + governed aggression) to `PortfolioWeights` and pre-fill the portfolio optimizer.

## Files Involved

**Frontend:**
- `frontend/lib/profiler/mapToPortfolioWeights.ts`
- `frontend/app/portfolio/page.tsx` — accept profile query/state
- `frontend/components/profiler/SendToOptimizerButton.tsx`

**Backend (optional):**
- `backend/app/services/profiler/mapping.py`
- `POST /api/v1/portfolio/from-profile` — server-side mapping for reports

## Mapping Rules (document in METHODOLOGY.md when implementing)

1. **High-level sleeves:** `g/i/s` percentages → equities / credit+income / cash+hard_assets split.
2. **Aggression dial:** higher → more small-cap, HY, alternatives carved from equity/income sleeves.
3. **Governor cap:** raises minimum cash floor when emergency fund or income dependency is weak.
4. **4-bucket carve-out:** alternatives from equity/income based on aggression (same logic as HTML report).

## API Contract (optional)

```
POST /api/v1/portfolio/from-profile
{
  "growth_pct": 45,
  "income_pct": 35,
  "safety_pct": 20,
  "governed_aggression_pct": 55
}
→ PortfolioWeights + narrative notes
```

## Verify

```bash
# Complete profiler → click "Analyze Portfolio" → optimizer sliders pre-filled
# Frontier computes with mapped weights
```

## Exit Criteria

- One-click flow from `/profiler` to `/portfolio` with weights populated.
- Mapping rules documented in `METHODOLOGY.md`.

## Depends On

- Module 12 (profiler)
- Module 08 (optimizer)

## See Also

- Module 15 — advisor report uses mapped weights
