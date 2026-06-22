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

export interface OptimizationConstraintsPayload {
  min_cash?: number | null;
  max_portfolio_vol?: number | null;
}

export interface FrontierRequest {
  weights: PortfolioWeights;
  suggested_weights?: PortfolioWeights;
  constraints?: OptimizationConstraintsPayload;
}

export interface EfficientFrontierResponse {
  frontier: FrontierPoint[];
  max_sharpe: FrontierPoint | null;
  min_vol: FrontierPoint | null;
  current: FrontierPoint;
  monte_carlo: FrontierPoint[];
  correlation_matrix: Record<string, Record<string, number>>;
  suggested?: FrontierPoint | null;
  constraints_applied?: OptimizationConstraintsPayload | null;
  constraint_warnings?: string[];
}

export interface IncomeAdequacyResult {
  portfolio_yield: number;
  annual_income_estimate?: number | null;
  annual_income_need?: number | null;
  gap_usd?: number | null;
  gap_pct?: number | null;
  status: "adequate" | "shortfall" | "unknown";
}

export interface StressScenarioResult {
  id: string;
  label: string;
  start: string;
  end: string;
  portfolio_drawdown: number;
  exceeds_tolerance: boolean;
  tolerance_pct: number;
}

export interface PortfolioAnalyticsRequest {
  weights: PortfolioWeights;
  profile_id?: number | null;
  answers?: Record<string, string>;
  governor_cap_pct?: number | null;
  portfolio_value_usd?: number | null;
  annual_income_need_usd?: number | null;
  annual_income_need_pct?: number | null;
}

export interface PortfolioAnalyticsResponse {
  income?: IncomeAdequacyResult | null;
  stress: StressScenarioResult[];
  constraints_applied?: OptimizationConstraintsPayload | null;
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
