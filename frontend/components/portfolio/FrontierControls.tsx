"use client";

import type { FrontierPoint } from "@/types/portfolio";
import { fmtPct, fmtNum } from "@/lib/utils/formatters";

interface FrontierControlsProps {
  maxSharpe: FrontierPoint | null;
  minVol: FrontierPoint | null;
  current: FrontierPoint | null;
}

/**
 * Summary cards showing Max Sharpe, Min Vol, and Current portfolio stats.
 */
export function FrontierControls({ maxSharpe, minVol, current }: FrontierControlsProps) {
  const portfolios = [
    { label: "Max Sharpe", color: "#22c55e", data: maxSharpe },
    { label: "Min Volatility", color: "#a855f7", data: minVol },
    { label: "Current", color: "#f97316", data: current },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mt-4">
      {portfolios.map(({ label, color, data }) => (
        <div
          key={label}
          className="bg-[#f6f9fc] rounded-lg p-3 border border-ff-border"
          style={{ borderColor: color + "40" }}
        >
          <div
            className="text-xs font-semibold mb-2"
            style={{ color }}
          >
            {label}
          </div>
          {data ? (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-ff-muted">Return</span>
                <span className="text-ff-navy font-mono">
                  {fmtPct(data.expected_return)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ff-muted">Volatility</span>
                <span className="text-ff-navy font-mono">
                  {fmtPct(data.volatility)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ff-muted">Sharpe</span>
                <span className="text-ff-navy font-mono">
                  {fmtNum(data.sharpe)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-ff-muted text-xs">Not available</div>
          )}
        </div>
      ))}
    </div>
  );
}
