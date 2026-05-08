# Module 07 — Components

## Dashboard Components (`components/dashboard/`)

### `AssetClassCard.tsx`
Full card for a single sub-asset class showing:
- Sub-class name + asset class category
- `RiskSpeedometer` gauge
- `CycleIndicator` phase dots
- Key metrics grid (return, vol, Sharpe, Sortino, max DD, VaR 99%)
- Valuation bar (cheap → expensive z-score)

**Props:** `data: AssetClassMetrics`

### `RiskSpeedometer.tsx`
Semicircular gauge built with Recharts `PieChart`.
- 4 colored arc segments (green → yellow → orange → red)
- Needle pointer at current risk score
- Score label and "Low / Moderate / Elevated / High" text

**Props:** `score: number` (0–100), `size?: number`

### `CycleIndicator.tsx`
4 colored dots (expansion / peak / contraction / trough) with the active phase highlighted.
Uses colors from `colorScale.ts`.

**Props:** `phase: CyclePhase`

### `EfficientFrontierChart.tsx`
Recharts `ComposedChart` with:
- Monte Carlo scatter (blue dots)
- Efficient frontier curve (amber line)
- Reference dots for Max Sharpe (green), Min Vol (purple), Current (orange)

**Props:** `data: EfficientFrontierResponse`

---

## Chart Components (`components/charts/`)

### `CycleChart.tsx`
Multi-line chart showing normalized price history (rebased to 100 at start).
Handles multiple sub-asset classes on the same chart.

**Props:** `assets: AssetClassMetrics[]`

### `CorrelationHeatmap.tsx`
Color-coded table showing pairwise correlations.
- Deep blue = -1.0, gray = 0, deep red = +1.0

**Props:** `matrix: Record<string, Record<string, number>>`

### `ReturnDistribution.tsx`
Grouped bar chart comparing key metrics across sub-classes:
Expected Return, Volatility, Sharpe, Max Drawdown.

**Props:** `assets: AssetClassMetrics[]`

### `YieldCurveChart.tsx`
Bar chart showing the yield curve (3M / 2Y / 5Y / 10Y / 30Y).
Connected to the live credit endpoint (`GET /api/v1/credit/yield-curve`) and renders current curve points.

---

## Layout Components (`components/layout/`)

### `Sidebar.tsx`
Left navigation with active route highlighting.
Links: Overview, Equities, Credit, Hard Assets, Cash, Portfolio.

### `Header.tsx`
Top bar showing current page title and today's date.

### `DataStatusBar.tsx`
Thin bar below header showing data freshness status (green dot = current, yellow = stale, red = error).
Polls `/api/v1/data-status` every 60 seconds.

---

## Portfolio Components (`components/portfolio/`)

### `AllocationSliders.tsx`
Slider for each asset class weight (0–100%).
Auto-normalizes when total ≠ 100%.
Runs optimizer on button click.

**Props:** `weights`, `onChange`, `onRun`, `isLoading`

### `FrontierControls.tsx`
3-column summary cards: Max Sharpe / Min Vol / Current portfolio.
Shows return, volatility, and Sharpe for each.

**Props:** `maxSharpe`, `minVol`, `current` (all `FrontierPoint | null`)
