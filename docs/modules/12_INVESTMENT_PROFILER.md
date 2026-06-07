# Module 12 — Investment Profiler

## Goal
Port the standalone `Finesse_Funds_Investment_Profiler (2).html` questionnaire into Next.js at `/profiler` with identical scoring logic.

## Files Involved

**Frontend:**
- `frontend/app/profiler/page.tsx`
- `frontend/lib/profiler/questions.ts` — OBJECTIVE, RISK, GOVERNOR question banks
- `frontend/lib/profiler/scoring.ts` — `computeScores()` (triangle, aggression, governor cap)
- `frontend/lib/profiler/report.ts` — advisor report narrative builder
- `frontend/components/profiler/ProfilerTabs.tsx`
- `frontend/components/profiler/QuestionBlock.tsx`
- `frontend/components/profiler/TriangleChart.tsx`
- `frontend/components/profiler/AggressionGauge.tsx`
- `frontend/components/profiler/AdvisorReport.tsx`

## Scoring Outputs

| Output | Description |
|--------|-------------|
| `g`, `i`, `s` | Normalized Growth / Income / Safety (0–1) |
| `rawAgg` | Risk tolerance 0–100 from Q6–Q10 |
| `govAgg` | Governor-capped aggression |
| `cap` | Max aggression from Q11–Q12 |

## API Contract

None required for v1 (client-side scoring). Optional later: `POST /api/v1/profiles` when Module 14 lands.

## Key Design Decisions

- Extract question data verbatim from HTML to preserve advisor workflow.
- Reuse Finesse components from Module 10.
- Save to localStorage initially; migrate to backend in Module 14.

## Verify

```bash
cd frontend && npm run dev
# Complete 12 questions — triangle, gauge, allocation bars, advisor report match HTML behavior
```

## Exit Criteria

- All 12 questions with three sections (Objective, Risk, Safeguards).
- Triangle, aggression dial, allocation bars, advisor report render correctly.
- Print summary works via browser print CSS.

## Depends On

- Module 10 (Finesse branding)

## See Also

- Module 13 — send profile to optimizer
