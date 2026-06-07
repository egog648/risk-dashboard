# Module 15 — Advisor Report

## Goal
Generate a client-ready advisor report combining profiler results, portfolio analysis, and live market context from the Risk Dashboard data layer.

## Files Involved

**Frontend:**
- `frontend/components/profiler/AdvisorReport.tsx` (enhanced)
- `frontend/lib/reports/buildAdvisorReport.ts`
- `frontend/app/reports/[proposalId]/page.tsx` (optional)

**Backend (optional):**
- `GET /api/v1/reports/advisor` — server-assembled report payload

## Report Sections

1. Client profile summary (objective label, risk posture, triangle coordinates)
2. Recommended asset allocation (stocks / bonds / alts / cash bars)
3. Advisor narrative (from profiler + mapping)
4. Governor warnings (if cap applied)
5. **Market callouts** — from `GET /api/v1/data-status`, asset risk scores, yield curve
6. Vehicle suggestions — from Module 16 registry
7. Disclaimer block (from HTML profiler)

## Market Callout Examples

- Credit spreads vs historical median → favor IG vs HY
- Elevated small-cap risk score → underweight suggestion
- Inverted yield curve → duration guidance

## Verify

```bash
# Complete profiler + optimizer → generate report → print preview matches Finesse styling
```

## Exit Criteria

- Report includes at least one live market callout when data is available.
- Print CSS hides nav and formats for PDF-via-browser.

## Depends On

- Module 13, Module 16 (vehicles)

## See Also

- HTML profiler `renderReport()` as reference implementation
