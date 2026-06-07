"use client";

import type { ProfilerScores } from "@/lib/profiler/scoring";
import { OBJECTIVE_COLORS } from "@/components/finesse/ObjectiveBar";

interface ImplementationDetailProps {
  scores: ProfilerScores;
}

export function ImplementationDetail({ scores }: ImplementationDetailProps) {
  if (scores.sum === 0) return null;

  const agg = scores.govAgg / 100;
  const idxPct = Math.round((1 - agg) * 100);
  const actPct = Math.round(agg * 100);
  const eqStyle =
    agg > 0.7
      ? "Individual stocks, sector ETFs, small-cap, EM"
      : agg > 0.4
        ? "Factor-tilted ETFs, international blend, sector tilt"
        : "Total market index, S&P 500, large-cap blend";
  const incStyle =
    agg > 0.6
      ? "High-yield corporates, preferreds, convertibles"
      : agg > 0.3
        ? "Corporate bonds, intermediate duration"
        : "Treasuries, investment-grade munis";

  return (
    <div className="mt-4 p-3.5 bg-[#f6f9fc] rounded-[10px] border border-ff-border">
      <div className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-2.5">
        Implementation Detail
      </div>
      {scores.g > 0 && (
        <div className="mb-2">
          <div className="text-[11px] font-bold mb-0.5" style={{ color: OBJECTIVE_COLORS.growth }}>
            Equity Sleeve ({Math.round(scores.g * 100)}%)
          </div>
          <div className="text-[11px] text-[#556677]">
            {idxPct}% index / passive — {actPct}% active / concentrated
          </div>
          <div className="text-[10px] text-ff-muted italic">{eqStyle}</div>
        </div>
      )}
      {scores.i > 0 && (
        <div className="mb-2">
          <div className="text-[11px] font-bold mb-0.5" style={{ color: OBJECTIVE_COLORS.income }}>
            Fixed Income Sleeve ({Math.round(scores.i * 100)}%)
          </div>
          <div className="text-[10px] text-ff-muted italic">{incStyle}</div>
        </div>
      )}
      {scores.s > 0 && (
        <div>
          <div className="text-[11px] font-bold mb-0.5" style={{ color: OBJECTIVE_COLORS.safety }}>
            Safety Sleeve ({Math.round(scores.s * 100)}%)
          </div>
          <div className="text-[10px] text-ff-muted italic">Money market, T-bills</div>
        </div>
      )}
    </div>
  );
}
