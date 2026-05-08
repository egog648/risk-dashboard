"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AssetClassMetrics } from "@/types/assets";
import { fmtSubClass } from "@/lib/utils/formatters";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#f97316", "#06b6d4"];

interface CycleChartProps {
  assets: AssetClassMetrics[];
}

/**
 * Normalized price history chart (rebased to 100 at start) for multiple sub-assets.
 */
export function CycleChart({ assets }: CycleChartProps) {
  if (!assets.length || !assets[0].history?.length) {
    return <div className="text-gray-500 text-sm">No history data available.</div>;
  }

  // Collect all dates across assets
  const dateSet = new Set<string>();
  assets.forEach((a) =>
    a.history.forEach((p) => dateSet.add(p.date.substring(0, 10)))
  );
  const sortedDates = Array.from(dateSet).sort();

  // Build a lookup for each asset
  const assetLookup: Record<string, Record<string, number>> = {};
  assets.forEach((a) => {
    const key = fmtSubClass(a.sub_class);
    assetLookup[key] = {};
    a.history.forEach((p) => {
      assetLookup[key][p.date.substring(0, 10)] = p.value;
    });
  });

  // Normalize each asset to 100 at first available date
  const startValues: Record<string, number> = {};
  assets.forEach((a) => {
    const key = fmtSubClass(a.sub_class);
    const first = a.history[0]?.value;
    startValues[key] = first || 1;
  });

  const chartData = sortedDates.map((date) => {
    const point: Record<string, number | string> = { date };
    assets.forEach((a) => {
      const key = fmtSubClass(a.sub_class);
      const val = assetLookup[key][date];
      if (val !== undefined) {
        point[key] = parseFloat(((val / startValues[key]) * 100).toFixed(2));
      }
    });
    return point;
  });

  // Thin to ~200 points for performance
  const step = Math.ceil(chartData.length / 200);
  const thinned = chartData.filter((_, i) => i % step === 0);

  const assetKeys = assets.map((a) => fmtSubClass(a.sub_class));

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={thinned} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            tickFormatter={(v) => v.substring(0, 7)}
            interval="preserveStartEnd"
            stroke="#6b7280"
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            stroke="#6b7280"
            tickFormatter={(v) => `${v}`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontSize: "11px",
            }}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#e5e7eb" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "#9ca3af" }}
          />
          {assetKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
