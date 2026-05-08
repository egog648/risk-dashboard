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
      <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
        Loading yield curve...
      </div>
    );
  }

  if (isError || !data?.points?.length) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
        Yield curve data unavailable
      </div>
    );
  }

  const chartData = data.points.map((p) => ({
    tenor: p.tenor,
    yield: p.yield_pct,
  }));

  const yMin = Math.floor(Math.min(...chartData.map((d) => d.yield)) * 10) / 10 - 0.1;
  const yMax = Math.ceil(Math.max(...chartData.map((d) => d.yield)) * 10) / 10 + 0.1;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="tenor"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={{ stroke: "#4b5563" }}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
            labelStyle={{ color: "#e5e7eb", fontSize: 12 }}
            itemStyle={{ color: "#60a5fa", fontSize: 12 }}
            formatter={(value: number) => [`${value.toFixed(3)}%`, "Yield"]}
          />
          <Line
            type="monotone"
            dataKey="yield"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ fill: "#60a5fa", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-600 mt-1 text-right">
        Source: FRED · as of {new Date(data.as_of).toLocaleDateString()}
      </p>
    </div>
  );
}
