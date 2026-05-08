export type CyclePhase = "expansion" | "peak" | "contraction" | "trough" | "unknown";

export interface YieldCurvePoint {
  tenor: string;
  label: string;
  yield_pct: number;
}

export interface YieldCurveResponse {
  points: YieldCurvePoint[];
  as_of: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface RiskMetrics {
  realized_vol: number | null;
  implied_vol: number | null;
  sharpe_ratio: number | null;
  sortino_ratio: number | null;
  max_drawdown: number | null;
  var_95: number | null;
  var_99: number | null;
  cvar_95: number | null;
  valuation_score: number | null;
  expected_return: number | null;
}

export interface AssetClassMetrics {
  asset_class: string;
  sub_class: string;
  cycle_phase: CyclePhase;
  risk_score: number;       // 0–100
  metrics: RiskMetrics;
  history: TimeSeriesPoint[];
  as_of: string;
}
