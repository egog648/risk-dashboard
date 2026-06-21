"use client";

import type { FrontierPoint, PortfolioWeights } from "@/types/portfolio";
import { WEIGHT_LABELS } from "@/types/portfolio";
import { fmtPct, fmtNum } from "@/lib/utils/formatters";

export type SelectedPortfolio = "max_sharpe" | "min_vol" | "current" | "suggested";

interface PortfolioComparisonPanelProps {
  selection: SelectedPortfolio;
  optimized: FrontierPoint | null;
  current: FrontierPoint | null;
  optimizedLabel: string;
  onApply?: () => void;
}

const WEIGHT_KEYS = Object.keys(WEIGHT_LABELS) as Array<keyof PortfolioWeights>;

function fmtSignedPctPoints(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} pp`;
}

function fmtSignedNum(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}`;
}

function deltaColor(delta: number): string {
  if (Math.abs(delta) < 0.0001) return "text-ff-muted";
  return delta > 0 ? "text-green-600" : "text-red-500";
}

function weightPct(weight: number | undefined): number {
  return (weight ?? 0) * 100;
}

export function PortfolioComparisonPanel({
  selection,
  optimized,
  current,
  optimizedLabel,
  onApply,
}: PortfolioComparisonPanelProps) {
  if (selection === "current") {
    if (!current) return null;

    return (
      <div className="mt-4 rounded-lg border border-ff-border bg-[#f6f9fc] p-4">
        <h4 className="text-xs font-bold text-ff-navy uppercase tracking-wide mb-3">
          Current Allocation
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 text-sm">
          {WEIGHT_KEYS.map((key) => (
            <div
              key={key}
              className="flex justify-between py-1.5 border-b border-[#e8edf2] text-xs"
            >
              <span className="text-ff-text-secondary">{WEIGHT_LABELS[key]}</span>
              <span className="font-mono font-bold text-ff-navy">
                {weightPct(current.weights[key]).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!optimized || !current) return null;

  const returnDelta = (optimized.expected_return - current.expected_return) * 100;
  const volDelta = (optimized.volatility - current.volatility) * 100;
  const sharpeDelta = optimized.sharpe - current.sharpe;

  return (
    <div className="mt-4 rounded-lg border border-ff-border bg-[#f6f9fc] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h4 className="text-xs font-bold text-ff-navy uppercase tracking-wide">
          {optimizedLabel} vs Current
        </h4>
        {onApply && (
          <button
            type="button"
            onClick={onApply}
            className="py-1.5 px-3 bg-ff-navy hover:bg-[#254d73] text-white text-xs font-medium rounded-lg transition-colors"
          >
            Apply to sliders
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" aria-label="Portfolio comparison">
          <thead>
            <tr className="border-b border-[#dde4ec] text-ff-muted">
              <th className="text-left py-2 font-semibold">Asset</th>
              <th className="text-right py-2 font-semibold">Current</th>
              <th className="text-right py-2 font-semibold">Optimized</th>
              <th className="text-right py-2 font-semibold">Change</th>
            </tr>
          </thead>
          <tbody>
            {WEIGHT_KEYS.map((key) => {
              const currentPct = weightPct(current.weights[key]);
              const optimizedPct = weightPct(optimized.weights[key]);
              const delta = optimizedPct - currentPct;

              return (
                <tr key={key} className="border-b border-[#e8edf2]">
                  <td className="py-1.5 text-ff-text-secondary">{WEIGHT_LABELS[key]}</td>
                  <td className="py-1.5 text-right font-mono text-ff-navy">
                    {currentPct.toFixed(1)}%
                  </td>
                  <td className="py-1.5 text-right font-mono text-ff-navy">
                    {optimizedPct.toFixed(1)}%
                  </td>
                  <td className={`py-1.5 text-right font-mono font-semibold ${deltaColor(delta)}`}>
                    {fmtSignedPctPoints(delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[#dde4ec] text-ff-muted">
              <td className="py-2 font-semibold">Expected Return</td>
              <td className="py-2 text-right font-mono text-ff-navy">
                {fmtPct(current.expected_return)}
              </td>
              <td className="py-2 text-right font-mono text-ff-navy">
                {fmtPct(optimized.expected_return)}
              </td>
              <td className={`py-2 text-right font-mono font-semibold ${deltaColor(returnDelta)}`}>
                {fmtSignedPctPoints(returnDelta)}
              </td>
            </tr>
            <tr className="text-ff-muted">
              <td className="py-2 font-semibold">Volatility</td>
              <td className="py-2 text-right font-mono text-ff-navy">
                {fmtPct(current.volatility)}
              </td>
              <td className="py-2 text-right font-mono text-ff-navy">
                {fmtPct(optimized.volatility)}
              </td>
              <td className={`py-2 text-right font-mono font-semibold ${deltaColor(volDelta)}`}>
                {fmtSignedPctPoints(volDelta)}
              </td>
            </tr>
            <tr className="text-ff-muted">
              <td className="py-2 font-semibold">Sharpe</td>
              <td className="py-2 text-right font-mono text-ff-navy">
                {fmtNum(current.sharpe)}
              </td>
              <td className="py-2 text-right font-mono text-ff-navy">
                {fmtNum(optimized.sharpe)}
              </td>
              <td className={`py-2 text-right font-mono font-semibold ${deltaColor(sharpeDelta)}`}>
                {fmtSignedNum(sharpeDelta)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
