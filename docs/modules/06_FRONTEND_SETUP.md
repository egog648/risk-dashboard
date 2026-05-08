# Module 06 — Frontend Setup

## Goal
Next.js 15 (App Router) with Tailwind CSS, Shadcn UI, Recharts, Tremor, and TanStack Query.

## Files Involved
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/next.config.ts`
- `frontend/tailwind.config.ts`
- `frontend/postcss.config.js`
- `frontend/app/globals.css`
- `frontend/app/layout.tsx` — Root layout with QueryClientProvider

## Local Setup (without Docker)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000

## Adding Shadcn UI components

After `npm install`, initialize Shadcn:
```bash
npx shadcn@latest init
```

Then add components as needed:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add progress
npx shadcn@latest add slider
npx shadcn@latest add tabs
```
Shadcn components are generated into `frontend/components/ui/`.

## TanStack Query Setup

The `QueryClient` is created in `app/layout.tsx` and wraps the entire app.
Data fetching uses `useQuery` hooks defined in `frontend/hooks/`.

Default config:
- `staleTime: 5 minutes` — don't refetch if data is less than 5 min old
- `retry: 2` — retry failed requests twice

## Tailwind Colors

Custom risk and cycle colors are defined in `tailwind.config.ts`:
```
risk-low      → #22c55e (green)
risk-medium   → #eab308 (yellow)
risk-high     → #f97316 (orange)
risk-critical → #ef4444 (red)
cycle-expansion   → #3b82f6 (blue)
cycle-peak        → #a855f7 (purple)
cycle-contraction → #f97316 (orange)
cycle-trough      → #22c55e (green)
```

## Route Structure

| Route | Page |
|---|---|
| `/` | Overview — all asset class cards |
| `/equities` | Equity sub-classes |
| `/credit` | Credit sub-classes + yield curve |
| `/hard-assets` | Hard asset sub-classes |
| `/cash` | Cash / money market |
| `/portfolio` | Interactive efficient frontier |

## API Proxy

`next.config.ts` rewrites `/api/backend/*` to `http://localhost:8000/api/v1/*`.
This allows server-side calls to use the rewrite URL without exposing the backend port.
Direct calls from client components use `NEXT_PUBLIC_API_URL`.
