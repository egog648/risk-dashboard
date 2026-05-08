export interface PortfolioWeights {
  equities_large: number;
  equities_mid: number;
  equities_small: number;
  credit_government: number;
  credit_corporate_ig: number;
  credit_corporate_hy: number;
  hard_assets_gold: number;
  hard_assets_reits: number;
  hard_assets_commodities: number;
  cash: number;
}

export interface FrontierPoint {
  expected_return: number;
  volatility: number;
  sharpe: number;
  weights: Record<string, number>;
}

export interface EfficientFrontierResponse {
  frontier: FrontierPoint[];
  max_sharpe: FrontierPoint;
  min_vol: FrontierPoint;
  current: FrontierPoint;
  monte_carlo: FrontierPoint[];
  correlation_matrix: Record<string, Record<string, number>>;
}

export const DEFAULT_WEIGHTS: PortfolioWeights = {
  equities_large: 0.20,
  equities_mid: 0.05,
  equities_small: 0.05,
  credit_government: 0.20,
  credit_corporate_ig: 0.10,
  credit_corporate_hy: 0.00,
  hard_assets_gold: 0.10,
  hard_assets_reits: 0.10,
  hard_assets_commodities: 0.05,
  cash: 0.15,
};

export const WEIGHT_LABELS: Record<keyof PortfolioWeights, string> = {
  equities_large: "Equities — Large Cap",
  equities_mid: "Equities — Mid Cap",
  equities_small: "Equities — Small Cap",
  credit_government: "Credit — Government",
  credit_corporate_ig: "Credit — Corporate IG",
  credit_corporate_hy: "Credit — Corporate HY",
  hard_assets_gold: "Hard Assets — Gold",
  hard_assets_reits: "Hard Assets — REITs",
  hard_assets_commodities: "Hard Assets — Commodities",
  cash: "Cash",
};
