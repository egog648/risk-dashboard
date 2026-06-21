"use client";

import type { AssetClassMetrics } from "@/types/assets";
import { RiskSpeedometer } from "./lazyDashboard";
import { CycleIndicator } from "./CycleIndicator";
import { fmtPct, fmtNum, fmtSubClass } from "@/lib/utils/formatters";

interface AssetClassCardProps {
  data: AssetClassMetrics;
}

export function AssetClassCard({ data }: AssetClassCardProps) {
  const m = data.metrics;

  return (
    <div className="bg-white border border-ff-border rounded-[14px] p-4 flex flex-col gap-3 shadow-[0_2px_12px_rgba(26,58,92,0.08)]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ff-muted uppercase tracking-wider">
            {data.asset_class.replace("_", " ")}
          </p>
          <h3 className="text-base font-semibold text-ff-navy leading-tight">
            {fmtSubClass(data.sub_class)}
          </h3>
        </div>
        <CycleIndicator phase={data.cycle_phase} />
      </div>

      {/* Speedometer */}
      <div className="flex justify-center py-1">
        <RiskSpeedometer score={data.risk_score} size={160} />
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <MetricRow label="Expected Return" value={fmtPct(m.expected_return)} />
        <MetricRow label="Realized Vol" value={fmtPct(m.realized_vol)} />
        <MetricRow label="Sharpe" value={fmtNum(m.sharpe_ratio)} />
        <MetricRow label="Sortino" value={fmtNum(m.sortino_ratio)} />
        <MetricRow label="Max Drawdown" value={fmtPct(m.max_drawdown)} />
        <MetricRow label="VaR 99%" value={fmtPct(m.var_99)} />
      </div>

      {/* Valuation bar */}
      {m.valuation_score != null && (
        <div>
          <div className="flex justify-between text-xs text-ff-muted mb-1">
            <span>Cheap</span>
            <span className="text-ff-navy">
              Valuation: {m.valuation_score > 0 ? "+" : ""}
              {m.valuation_score.toFixed(2)}σ
            </span>
            <span>Expensive</span>
          </div>
          <div className="h-1.5 bg-[#e8edf2] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${((m.valuation_score + 3) / 6) * 100}%`,
                backgroundColor:
                  m.valuation_score > 1.5
                    ? "#ef4444"
                    : m.valuation_score < -1.5
                    ? "#22c55e"
                    : "#eab308",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-ff-muted">{label}</span>
      <span className="text-ff-navy text-right font-mono">{value}</span>
    </>
  );
}
