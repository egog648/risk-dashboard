"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  ReferenceDot,
} from "recharts";
import type { EfficientFrontierResponse } from "@/types/portfolio";
import { fmtPct, fmtNum } from "@/lib/utils/formatters";

interface EfficientFrontierChartProps {
  data: EfficientFrontierResponse;
}

export function EfficientFrontierChart({ data }: EfficientFrontierChartProps) {
  const mcData = data.monte_carlo.map((p) => ({
    x: p.volatility * 100,
    y: p.expected_return * 100,
    sharpe: p.sharpe,
  }));

  const frontierData = data.frontier.map((p) => ({
    x: p.volatility * 100,
    y: p.expected_return * 100,
    sharpe: p.sharpe,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs">
        <div className="text-gray-300">Return: {fmtPct(d.y / 100)}</div>
        <div className="text-gray-300">Vol: {fmtPct(d.x / 100)}</div>
        <div className="text-gray-300">Sharpe: {fmtNum(d.sharpe)}</div>
      </div>
    );
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="x"
            type="number"
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            label={{
              value: "Volatility",
              position: "insideBottom",
              offset: -10,
              fill: "#9ca3af",
              fontSize: 11,
            }}
            stroke="#6b7280"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            label={{
              value: "Expected Return",
              angle: -90,
              position: "insideLeft",
              fill: "#9ca3af",
              fontSize: 11,
            }}
            stroke="#6b7280"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Monte Carlo scatter */}
          <Scatter name="Monte Carlo" data={mcData} fill="#3b82f6" opacity={0.25} r={2} />

          {/* Efficient frontier curve */}
          <Line
            data={frontierData}
            type="monotone"
            dataKey="y"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="Frontier"
          />

          {/* Key points */}
          {data.max_sharpe && (
            <ReferenceDot
              x={data.max_sharpe.volatility * 100}
              y={data.max_sharpe.expected_return * 100}
              r={6}
              fill="#22c55e"
              stroke="#ffffff"
              strokeWidth={1.5}
              label={{ value: "Max Sharpe", fill: "#22c55e", fontSize: 10, dy: -10 }}
            />
          )}
          {data.min_vol && (
            <ReferenceDot
              x={data.min_vol.volatility * 100}
              y={data.min_vol.expected_return * 100}
              r={6}
              fill="#a855f7"
              stroke="#ffffff"
              strokeWidth={1.5}
              label={{ value: "Min Vol", fill: "#a855f7", fontSize: 10, dy: -10 }}
            />
          )}
          {data.current && (
            <ReferenceDot
              x={data.current.volatility * 100}
              y={data.current.expected_return * 100}
              r={8}
              fill="#f97316"
              stroke="#ffffff"
              strokeWidth={2}
              label={{ value: "Current", fill: "#f97316", fontSize: 10, dy: -10 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-2 text-xs text-gray-400">
        <LegendDot color="#3b82f6" label="Monte Carlo" />
        <LegendDot color="#f59e0b" label="Frontier" />
        <LegendDot color="#22c55e" label="Max Sharpe" />
        <LegendDot color="#a855f7" label="Min Vol" />
        <LegendDot color="#f97316" label="Current" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="w-2.5 h-2.5 rounded-full inline-block"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}
