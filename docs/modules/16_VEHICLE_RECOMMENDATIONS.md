# Module 16 — Vehicle Recommendations

## Goal
Match client profile (G/I/S triangle + aggression) to tickers in the custom registry — e.g. high aggression + income objective → JEPI, JEPQ.

## Files Involved

**Backend:**
- `backend/app/services/tickers/recommendations.py`
- `GET /api/v1/tickers/recommend` in `tickers.py`

**Frontend:**
- `frontend/components/profiler/VehicleSuggestions.tsx`
- `frontend/hooks/useTickerRecommendations.ts`

## API Contract

```
GET /api/v1/tickers/recommend?growth_pct=45&income_pct=35&safety_pct=20&aggression=55&asset_class=equities
```

**Response:** ranked list of registry tickers with match score and rationale.

## Scoring Logic

1. Filter by `asset_class` and `is_active=true`.
2. Score by cosine similarity (or L1 distance) between profile triangle and ticker G/I/S weights.
3. Boost income-primary tickers when `income_pct` dominates.
4. For high aggression + income need, surface covered-call equity tickers (JEPI, JEPQ, SCHD).

## Verify

```bash
# Seed JEPI, VTI, BIL in registry
# Profile: 45G/35I/20S, aggression 55 → JEPI ranks high for income-equity sleeve
curl "http://localhost:8000/api/v1/tickers/recommend?growth_pct=45&income_pct=35&safety_pct=20&aggression=55&asset_class=equities"
```

## Exit Criteria

- Recommend endpoint returns ranked tickers with scores.
- Profiler or advisor report displays top matches per sleeve.

## Depends On

- Module 11 (registry)
- Module 12 or 13 (profile inputs)

## See Also

- Module 15 — report embeds vehicle tables
