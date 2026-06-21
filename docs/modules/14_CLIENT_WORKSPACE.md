# Module 14 — Client Workspace

## Goal
Replace browser-only localStorage with persisted client records, linked profiles, portfolios, and versioned portfolio outlines.

## Files Involved

**Backend:**
- `backend/app/models/db_models.py` — `Client`, `ClientProfile`, `Portfolio`, `PortfolioOutline`
- `backend/app/api/v1/endpoints/clients.py`
- `backend/app/services/clients/workspace.py`

**Frontend:**
- `frontend/app/clients/page.tsx`
- `frontend/app/clients/[id]/page.tsx`
- `frontend/app/clients/[id]/portfolios/[pid]/page.tsx`
- `frontend/lib/api/clients.ts`
- `frontend/hooks/useClients.ts`, `useAllClientPortfolios.ts`, `useSelectedPortfolioLoadout.ts`

## Data Model

- **Client:** name, notes, created_at
- **ClientProfile:** client_id (or portfolio_id), 12 answers JSON, computed scores, saved_at
- **Portfolio:** client_id, name, notes, status
- **PortfolioOutline:** portfolio_id, profile_id, weights JSON, status (`draft` | `presented` | `implemented`)

## API Contract

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/clients` | List clients |
| `POST` | `/api/v1/clients` | Create client |
| `GET` | `/api/v1/clients/{id}` | Get client |
| `PUT` | `/api/v1/clients/{id}` | Update client |
| `DELETE` | `/api/v1/clients/{id}` | Delete client |
| `GET` | `/api/v1/clients/{id}/profiles` | List client profiles |
| `POST` | `/api/v1/clients/{id}/profiles` | Save profiler result to client |
| `GET` | `/api/v1/clients/{id}/portfolios` | List portfolios |
| `POST` | `/api/v1/clients/{id}/portfolios` | Create portfolio |
| `GET` | `/api/v1/clients/{id}/portfolios/{pid}` | Get portfolio |
| `PUT` | `/api/v1/clients/{id}/portfolios/{pid}` | Update portfolio |
| `DELETE` | `/api/v1/clients/{id}/portfolios/{pid}` | Delete portfolio |
| `POST` | `/api/v1/clients/{id}/portfolios/{pid}/profiles` | Save profile scoped to portfolio |
| `GET` | `/api/v1/clients/{id}/portfolios/{pid}/outlines` | List portfolio outlines |
| `POST` | `/api/v1/clients/{id}/portfolios/{pid}/outlines` | Generate outline from latest profile |
| `PATCH` | `/api/v1/clients/{id}/portfolios/{pid}/outlines/{oid}` | Update outline status |

## Verify

```bash
# Create client → save profile → create portfolio → generate outline → reload and retrieve
curl -X POST http://localhost:8000/api/v1/clients -H "Content-Type: application/json" -d '{"name":"Test Client"}'
```

## Exit Criteria

- Clients persist across browser sessions.
- Import path from HTML profiler CSV/localStorage export (optional script).

## Depends On

- Module 11 (tickers), Module 12 (profiler)

## See Also

- Module 15 — reports tied to client records
- Module 13 — profile → portfolio weight mapping
