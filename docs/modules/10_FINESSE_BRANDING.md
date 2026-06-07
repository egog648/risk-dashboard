# Module 10 — Finesse Funds Branding

## Goal
Establish the Finesse Funds visual system (from the Investment Profiler HTML) as shared design tokens and layout primitives for all Phase 2 practice routes.

## Files Involved

**Frontend:**
- `frontend/app/globals.css` — CSS variables
- `frontend/tailwind.config.ts` — Tailwind color extensions
- `frontend/app/layout.tsx` — DM Sans font, light theme shell
- `frontend/components/finesse/FinesseHeader.tsx`
- `frontend/components/finesse/FinesseCard.tsx`
- `frontend/components/finesse/ObjectiveBar.tsx`
- `frontend/components/layout/Sidebar.tsx` — Finesse nav styling

## Design Tokens

From `Finesse_Funds_Investment_Profiler (2).html`:

| Token | Value | Use |
|-------|-------|-----|
| `--ff-navy` | `#1a3a5c` | Header, primary text, active borders |
| `--ff-green` | `#2a7d5f` | Growth objective |
| `--ff-blue` | `#2a5d9f` | Income objective |
| `--ff-gold` | `#9f8a2a` | Safety objective |
| `--ff-bg` | `#f0f4f8` | Page background |
| `--ff-card-border` | `#e0e8f0` | Card borders |

Font: **DM Sans** via `next/font/google`.

## Key Design Decisions

- Migrate the app shell from dark (`gray-950`) to light Finesse theme for brand consistency.
- Macro dashboard pages reuse the same shell; chart colors may stay data-viz oriented.
- Practice routes (`/tickers`, future `/profiler`, `/clients`) use `FinesseCard` and `FinesseHeader`.

## Verify

```bash
cd frontend && npm run dev
# Open http://localhost:3000/tickers — navy header, light background, DM Sans
```

## Exit Criteria

- DM Sans loaded app-wide.
- Finesse tokens available in Tailwind (`ff-navy`, `ff-green`, etc.).
- Shared `FinesseHeader`, `FinesseCard`, `ObjectiveBar` components exist and are used on `/tickers`.

## See Also

- Module 11 — first consumer of these components
- `docs/ARCHITECTURE.md` — Advisory Practice section
