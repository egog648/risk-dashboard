"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AssetClassMetrics } from "@/types/assets";
import { fmtSubClass } from "@/lib/utils/formatters";
import { CHART_THEME, rechartsAxisTick, rechartsTooltipProps } from "@/lib/utils/chartTheme";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#f97316"];

interface ReturnDistributionProps {
  assets: AssetClassMetrics[];
}

/**
 * Bar chart comparing key risk/return metrics across sub-asset classes.
 */
export function ReturnDistribution({ assets }: ReturnDistributionProps) {
  const metrics = [
    { key: "expected_return", label: "Exp. Return" },
    { key: "realized_vol", label: "Volatility" },
    { key: "sharpe_ratio", label: "Sharpe" },
    { key: "max_drawdown", label: "Max DD" },
  ] as const;

  const data = metrics.map(({ key, label }) => {
    const row: Record<string, string | number> = { metric: label };
    assets.forEach((a) => {
      const val = a.metrics[key];
      row[fmtSubClass(a.sub_class)] = val != null ? parseFloat((val * 100).toFixed(2)) : 0;
    });
    return row;
  });

  const assetKeys = assets.map((a) => fmtSubClass(a.sub_class));

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
          <XAxis
            dataKey="metric"
            tick={rechartsAxisTick(11)}
            stroke={CHART_THEME.axis}
          />
          <YAxis
            tick={rechartsAxisTick(10)}
            stroke={CHART_THEME.axis}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            {...rechartsTooltipProps()}
            formatter={(val: number) => [`${val.toFixed(2)}%`]}
          />
          <Legend wrapperStyle={CHART_THEME.legend} />
          {assetKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={2} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
