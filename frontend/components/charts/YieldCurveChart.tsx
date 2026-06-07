"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchYieldCurve } from "@/lib/api/credit";
import { CHART_THEME, rechartsAxisTick, rechartsTooltipProps } from "@/lib/utils/chartTheme";

export function YieldCurveChart() {
  const [mounted, setMounted] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["yield-curve"],
    queryFn: fetchYieldCurve,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || isLoading) {
    return (
      <div className="h-40 flex items-center justify-center text-ff-muted text-sm">
        Loading yield curve...
      </div>
    );
  }

  if (isError || !data?.points?.length) {
    return (
      <div className="h-40 flex items-center justify-center text-ff-muted text-sm">
        Yield curve data unavailable
      </div>
    );
  }

  const chartData = data.points.map((p) => ({
    tenor: p.tenor,
    yieldPct: p.yield_pct,
  }));

  const yMin = Math.floor(Math.min(...chartData.map((d) => d.yieldPct)) * 10) / 10 - 0.1;
  const yMax = Math.ceil(Math.max(...chartData.map((d) => d.yieldPct)) * 10) / 10 + 0.1;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
          <XAxis
            dataKey="tenor"
            tick={rechartsAxisTick(11)}
            axisLine={{ stroke: CHART_THEME.axis }}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            tick={rechartsAxisTick(11)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            {...rechartsTooltipProps()}
            itemStyle={{ color: "#2a5d9f", fontSize: 12 }}
            formatter={(value) => {
              const num = typeof value === "number" ? value : Number(value);
              return [`${Number.isFinite(num) ? num.toFixed(3) : "—"}%`, "Yield"];
            }}
          />
          <Line
            type="monotone"
            dataKey="yieldPct"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ fill: "#60a5fa", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-ff-text-secondary mt-1 text-right">
        Source: FRED · as of {new Date(data.as_of).toLocaleDateString()}
      </p>
    </div>
  );
}
