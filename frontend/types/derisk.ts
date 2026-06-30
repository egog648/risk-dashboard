export type TaxTreatment =
  | "taxable_individual"
  | "taxable_trust"
  | "traditional_ira"
  | "roth_ira"
  | "401k";

export type TierMode = "tax_budget" | "beta_target";

export interface DeRiskClientPortfolioOption {
  client_id: number;
  client_name: string;
  portfolio_id: number;
  portfolio_name: string;
  has_holdings: boolean;
  latest_run_id: number | null;
}

export interface DeriskAssumptions {
  id: number;
  portfolio_id: number;
  tax_treatment: TaxTreatment;
  tier_mode: TierMode;
  fed_ltcg: number;
  fed_stcg: number;
  niit: number;
  state_rate: number;
  dd1: number;
  dd2: number;
  dd3: number;
  dist_rate: number;
  beta_floor: number;
  beta_method: string;
  tax_budgets: number[];
  beta_targets: number[];
  lt_rate: number;
  st_rate: number;
  updated_at: string;
}

export interface Lot {
  id: number;
  ticker: string;
  name: string;
  section: string;
  trade_date: string | null;
  holding_period: string;
  quantity: number;
  market_value: number;
  total_cost: number;
  unrealized_gl: number;
  stress_beta: number;
  raw_beta: number | null;
}

export interface HoldingsSnapshot {
  id: number;
  portfolio_id: number;
  statement_date: string | null;
  source: string;
  total_value: number;
  cash_value: number;
  lot_count: number;
  created_at: string;
  lots: Lot[];
}

export interface DeriskAnalysisRun {
  id: number;
  portfolio_id: number;
  snapshot_id: number;
  assumptions_id: number;
  beta_before: number;
  created_at: string;
}

export interface TierRow {
  budget: number;
  beta_target?: number;
  n_lots: number;
  proceeds: number;
  gross_tax: number;
  net_tax_incl_harvest: number;
  beta_before: number;
  beta_after: number;
  new_cash_pct: number;
  runway_years_after: number;
  drawdown_protection: Record<string, number>;
}

export interface DeriskTiers {
  run_id: number;
  hold_all: {
    total: number;
    cash: number;
    beta_incl_cash: number;
    drawdown_loss: Record<string, number>;
    distribution_5pct: number;
    runway_years: number;
  };
  tiers: TierRow[];
  tier_mode: TierMode;
}

export interface SoldLot {
  ticker: string;
  name: string;
  trade_date: string | null;
  term: string;
  quantity: number | null;
  market_value: number;
  unrealized_gl: number | null;
  stress_beta: number;
  tax_to_sell: number;
  beta_dollars_removed: number;
  exposure_per_tax_dollar: number | null;
  entry_tier: number;
}

export interface DeriskSellList {
  run_id: number;
  hold_all: Record<string, number>;
  tier_summary: Record<string, Record<string, number>>;
  sold_lots: SoldLot[];
  incremental_positions: Record<string, Array<Record<string, unknown>>>;
  tier_mode: TierMode;
}

export interface DeriskAssumptionsUpdate {
  tax_treatment?: TaxTreatment;
  tier_mode?: TierMode;
  fed_ltcg?: number;
  fed_stcg?: number;
  niit?: number;
  state_rate?: number;
  dd1?: number;
  dd2?: number;
  dd3?: number;
  dist_rate?: number;
  beta_floor?: number;
  tax_budgets?: number[];
  beta_targets?: number[];
}
