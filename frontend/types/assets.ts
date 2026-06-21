export type CyclePhase = "expansion" | "peak" | "contraction" | "trough" | "unknown";

export interface YieldCurvePoint {
  tenor: string;
  label: string;
  yield_pct: number;
}

export type DataStatusLevel = "ok" | "partial" | "unavailable";

export interface YieldCurveResponse {
  points: YieldCurvePoint[];
  data_status: DataStatusLevel;
  missing_series: string[];
  as_of: string;
}

export interface SeriesStatus {
  series_id: string;
  source: string;
  last_refreshed: string | null;
  status: string;
}

export interface RefreshRunSummary {
  state: "idle" | "running" | "completed" | "failed";
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  total_series: number;
  ok_count: number;
  error_count: number;
  failed_series: string[];
}

export interface DataStatusResponse {
  series: SeriesStatus[];
  overall_status: "ok" | "stale" | "error";
  as_of: string;
  last_refresh_run?: RefreshRunSummary | null;
  assumptions_version?: string | null;
  assumptions_as_of?: string | null;
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
