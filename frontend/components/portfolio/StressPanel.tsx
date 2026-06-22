"use client";

import type { StressScenarioResult } from "@/types/portfolio";
import { fmtPct } from "@/lib/utils/formatters";

interface StressPanelProps {
  scenarios: StressScenarioResult[];
  tolerancePct?: number;
  compact?: boolean;
}

export function StressPanel({ scenarios, tolerancePct, compact = false }: StressPanelProps) {
  if (scenarios.length === 0) {
    return (
      <p className="text-xs text-ff-muted italic">
        No stress scenarios available yet. Seed ETF price history from the dashboard (Refresh
        Data), then re-run the optimizer.
      </p>
    );
  }

  const tolerance = tolerancePct ?? scenarios[0]?.tolerance_pct;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <p className="text-xs text-ff-text-secondary">
          Historical buy-and-hold replay vs Q6 max tolerable decline (
          {tolerance != null ? fmtPct(tolerance) : "—"}).
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-ff-muted border-b border-ff-border">
              <th className="py-2 pr-3 font-semibold">Scenario</th>
              <th className="py-2 pr-3 font-semibold">Drawdown</th>
              <th className="py-2 font-semibold">Tolerance</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((scenario) => (
              <tr key={scenario.id} className="border-b border-[#e8edf2] last:border-0">
                <td className="py-2 pr-3 text-ff-navy font-medium">{scenario.label}</td>
                <td className="py-2 pr-3 font-mono">{fmtPct(scenario.portfolio_drawdown)}</td>
                <td className="py-2">
                  {scenario.exceeds_tolerance ? (
                    <span className="text-red-600 font-semibold">Exceeds limit</span>
                  ) : (
                    <span className="text-ff-green font-semibold">Within limit</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
