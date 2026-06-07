# Module 14 — Client Workspace

## Goal
Replace browser-only localStorage with persisted client records, linked profiles, and versioned portfolio proposals.

## Files Involved

**Backend:**
- `backend/app/models/db_models.py` — `Client`, `ClientProfile`, `Proposal`
- `backend/app/api/v1/endpoints/clients.py`
- `backend/app/services/clients/workspace.py`

**Frontend:**
- `frontend/app/clients/page.tsx`
- `frontend/app/clients/[id]/page.tsx`
- `frontend/lib/api/clients.ts`
- `frontend/hooks/useClients.ts`

## Data Model

- **Client:** name, notes, created_at
- **ClientProfile:** client_id, 12 answers JSON, computed scores, saved_at
- **Proposal:** client_id, profile_id, weights JSON, status (`draft` | `presented` | `implemented`)

## API Contract

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/api/v1/clients` | List / create clients |
| `GET/PUT/DELETE` | `/api/v1/clients/{id}` | Client CRUD |
| `POST` | `/api/v1/clients/{id}/profiles` | Save profiler result |
| `POST` | `/api/v1/clients/{id}/proposals` | Save portfolio proposal |

## Verify

```bash
# Create client → save profile → save proposal → reload and retrieve
```

## Exit Criteria

- Clients persist across browser sessions.
- Import path from HTML profiler CSV/localStorage export (optional script).

## Depends On

- Module 11 (tickers), Module 12 (profiler)

## See Also

- Module 15 — reports tied to client records
