import type { AssetClassMetrics, YieldCurveResponse } from "@/types/assets";
import type { MarketCalloutContext } from "@/lib/reports/buildMarketCallouts";
import type { SleeveAllocation } from "@/lib/profiler/report";
import type { EfficientFrontierResponse } from "@/types/portfolio";

function makeAsset(
  subClass: string,
  overrides: Partial<AssetClassMetrics> & { metrics?: Partial<AssetClassMetrics["metrics"]> } = {}
): AssetClassMetrics {
  const { metrics: metricOverrides, ...rest } = overrides;
  return {
    asset_class: rest.asset_class ?? "Macro",
    sub_class: subClass,
    cycle_phase: rest.cycle_phase ?? "expansion",
    risk_score: rest.risk_score ?? 41,
    metrics: {
      realized_vol: 0.15,
      implied_vol: 0.19,
      sharpe_ratio: 0.9,
      sortino_ratio: 1.1,
      max_drawdown: -0.2,
      var_95: -0.03,
      var_99: -0.05,
      cvar_95: -0.06,
      valuation_score: 0.2,
      expected_return: 0.08,
      ...metricOverrides,
    },
    history: [{ date: "2026-05-08T00:00:00Z", value: 100 }],
    as_of: "2026-05-08T12:00:00Z",
    ...rest,
  };
}

function makeYieldCurve(inverted: boolean): YieldCurveResponse {
  return {
    points: inverted
      ? [
          { tenor: "3M", label: "3-Month", yield_pct: 4.5 },
          { tenor: "2Y", label: "2-Year", yield_pct: 4.8 },
          { tenor: "10Y", label: "10-Year", yield_pct: 4.2 },
          { tenor: "30Y", label: "30-Year", yield_pct: 4.3 },
        ]
      : [
          { tenor: "3M", label: "3-Month", yield_pct: 4.2 },
          { tenor: "2Y", label: "2-Year", yield_pct: 4.0 },
          { tenor: "10Y", label: "10-Year", yield_pct: 4.3 },
          { tenor: "30Y", label: "30-Year", yield_pct: 4.5 },
        ],
    data_status: "ok",
    missing_series: [],
    as_of: "2026-05-08T12:00:00Z",
  };
}

export const defaultSleeve: SleeveAllocation = {
  stocks: 40,
  bonds: 35,
  alts: 5,
  cash: 20,
};

export function makeMarketContext(
  overrides: Partial<MarketCalloutContext> = {}
): MarketCalloutContext {
  return {
    equities: [
      makeAsset("large_cap", { risk_score: 45 }),
      makeAsset("mid_cap", { risk_score: 50 }),
      makeAsset("small_cap", { risk_score: 55 }),
    ],
    credit: [
      makeAsset("government", { asset_class: "credit" }),
      makeAsset("corporate_ig", { asset_class: "credit", risk_score: 38 }),
      makeAsset("corporate_hy", { asset_class: "credit", risk_score: 52 }),
    ],
    yieldCurve: makeYieldCurve(false),
    dataStatus: { overall_status: "ok", as_of: "2026-05-08T12:00:00Z", series: [] },
    ...overrides,
  };
}

export const fixtures = {
  equities: [
    makeAsset("large_cap"),
    makeAsset("mid_cap"),
    makeAsset("small_cap"),
  ],
  credit: [
    makeAsset("government", { asset_class: "credit" }),
    makeAsset("corporate_ig", { asset_class: "credit" }),
    makeAsset("corporate_hy", { asset_class: "credit" }),
  ],
  hardAssets: [
    makeAsset("gold", { asset_class: "hard_assets" }),
    makeAsset("reits", { asset_class: "hard_assets" }),
    makeAsset("commodities", { asset_class: "hard_assets" }),
  ],
  cash: [makeAsset("money_market", { asset_class: "cash" })],
  yieldCurve: makeYieldCurve(false),
  yieldCurveInverted: makeYieldCurve(true),
  dataStatus: {
    overall_status: "ok" as const,
    as_of: "2026-05-08T12:00:00Z",
    series: [],
  },
  dataStatusStale: {
    overall_status: "stale" as const,
    as_of: "2026-05-08T12:00:00Z",
    series: [],
  },
  frontier: {
    frontier: [
      {
        expected_return: 0.07,
        volatility: 0.11,
        sharpe: 0.63,
        weights: { equities_large: 0.2, cash: 0.8 },
      },
    ],
    max_sharpe: {
      expected_return: 0.09,
      volatility: 0.12,
      sharpe: 0.75,
      weights: { equities_large: 0.35, cash: 0.65 },
    },
    min_vol: {
      expected_return: 0.05,
      volatility: 0.07,
      sharpe: 0.5,
      weights: { credit_government: 0.45, cash: 0.55 },
    },
    current: {
      expected_return: 0.08,
      volatility: 0.1,
      sharpe: 0.7,
      weights: { equities_large: 0.2, cash: 0.8 },
    },
    monte_carlo: [
      {
        expected_return: 0.08,
        volatility: 0.13,
        sharpe: 0.62,
        weights: { equities_large: 0.3, cash: 0.7 },
      },
    ],
    correlation_matrix: {
      equities_large: { equities_large: 1, cash: 0.1 },
      cash: { equities_large: 0.1, cash: 1 },
    },
  } satisfies EfficientFrontierResponse,
};

export { makeAsset, makeYieldCurve };
