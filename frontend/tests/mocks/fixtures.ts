import type { AssetClassMetrics } from "@/types/assets";
import type { EfficientFrontierResponse } from "@/types/portfolio";

function makeAsset(subClass: string): AssetClassMetrics {
  return {
    asset_class: "Macro",
    sub_class: subClass,
    cycle_phase: "expansion",
    risk_score: 41,
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
    },
    history: [{ date: "2026-05-08T00:00:00Z", value: 100 }],
    as_of: "2026-05-08T12:00:00Z",
  };
}

export const fixtures = {
  equities: [makeAsset("Large Cap"), makeAsset("Mid Cap"), makeAsset("Small Cap")],
  credit: [makeAsset("Government"), makeAsset("Corporate IG"), makeAsset("Corporate HY")],
  hardAssets: [makeAsset("Gold"), makeAsset("REITs"), makeAsset("Commodities")],
  cash: [makeAsset("Money Market")],
  dataStatus: {
    overall_status: "ok",
    as_of: "2026-05-08T12:00:00Z",
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
