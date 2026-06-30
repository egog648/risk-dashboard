# Prospect De-Risk Module — Cursor Handoff

Self-contained reference for building the **Prospect De-Risk Analyzer** into the
Risk Dashboard app (`github.com/egog648/risk-dashboard`). Point Cursor at this folder
and copy what it needs.

## What's here

```
prospect_derisk_module/
├── BUILD_GUIDE.md      ← start here: the module 18 spec (objective, services,
│                          data model, API, frontend, testing, build sequence)
├── README.md           ← this file
├── engine/             ← reference Python (the validated logic to port)
│   ├── decision_analysis.py   per-lot breakeven + exposure-per-tax-$
│   ├── build_sell_tiers.py    greedy tier selection per tax budget
│   ├── build_sell_list.py     tier-tags each lot; position + lot rollups
│   ├── tax_engine.py          trust marginal-rate tax per lot
│   ├── analyze_risk.py        stress betas
│   └── optimize_portfolio.py  efficient frontier (reuse app's PyPortfolioOpt instead)
└── fixtures/           ← golden-master data for regression tests
    ├── corrected_portfolio.json   input: positions + lots + betas
    ├── tax_analysis.json          input: per-lot tax detail
    ├── decision_analysis.json     expected: per-lot decision analytic
    ├── sell_tiers.json            expected: the tier menu
    └── sell_list.json             expected: per-tier specific lots
```

## How to use

1. Read `BUILD_GUIDE.md`.
2. Port `engine/` into `backend/services/prospect/` as **pure functions** (drop the
   JSON file I/O; take args, return objects). Reuse the app's existing Tiingo fetcher
   and PyPortfolioOpt code — don't duplicate them.
3. Use `fixtures/` as unit-test golden masters. The acceptance numbers are in
   BUILD_GUIDE §7 (e.g. $250K tax → 108 lots → beta 0.76→0.51).
4. Build in the order in BUILD_GUIDE §8.

The reference scripts read/write flat JSON in their own directory — that's scaffolding
for the desktop analysis, not the app design. The math is what matters; replicate it
exactly and the golden-master tests will confirm it.
