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
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="metric"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            stroke="#6b7280"
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            stroke="#6b7280"
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontSize: "11px",
            }}
            formatter={(val: number) => [`${val.toFixed(2)}%`]}
          />
          <Legend wrapperStyle={{ fontSize: "11px", color: "#9ca3af" }} />
          {assetKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={2} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
