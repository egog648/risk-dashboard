# Performance Baseline — 2026-06-21

Recorded during the performance optimization pass. Re-measure after each phase using the same commands.

## Measurement commands

**Backend (warm SQLite cache):**

```powershell
# Start backend: cd backend; uvicorn app.main:app --port 8000
Invoke-RestMethod http://localhost:8000/api/v1/equities/all -Headers @{"Accept"="application/json"}
# Check X-Response-Time response header
```

**Payload sizes:**

```powershell
$r = Invoke-WebRequest "http://localhost:8000/api/v1/equities/all?include_history=false"
$r.RawContentLength  # metrics-only
$r2 = Invoke-WebRequest "http://localhost:8000/api/v1/equities/all?include_history=true"
$r2.RawContentLength  # full history
```

## Baseline findings (architecture review)

| Bottleneck | Impact | Mitigation in this pass |
|------------|--------|-------------------------|
| Full CSR shell (`layout.tsx` client-only) | Every nav waits for JS hydrate + fetch | ClientShell split + Overview dehydration |
| No route `loading.tsx` | Frozen UI during transitions | Skeleton loading states |
| 4× `/all` calls with 756pt history on Overview | Large JSON + parse time | `include_history=false` default |
| Portfolio auto-runs frontier on mount | Expensive POST on sidebar click | Run on demand only |
| Recharts statically imported | Heavy route JS bundles | Dynamic imports |
| No backend response cache | Recompute metrics on cold React Query | 10min TTL cache on `/all` |
| Dev Docker CMD (`npm run dev`) | Slower than prod build | Prod Docker profiles |

## Expected post-optimization targets

- Overview `/all` payloads (metrics-only): ~5–15 KB per asset class vs ~100 KB+ with history
- Portfolio page: zero API calls until user clicks Run Optimizer
- Navigation: skeleton visible immediately via `loading.tsx`
- Backend `/all` warm cache: sub-100ms with response cache (verify with `X-Response-Time`)

## Instrumentation added

- `TimingMiddleware` in `backend/app/main.py` — logs `duration_ms` and sets `X-Response-Time` header on all requests
