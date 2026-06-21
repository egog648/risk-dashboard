"use client";

import { useMemo } from "react";
import {
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
import { CHART_THEME, rechartsAxisTick } from "@/lib/utils/chartTheme";

interface EfficientFrontierChartProps {
  data: EfficientFrontierResponse;
}

const REFERENCE_STROKE = "#1a3a5c";

export function EfficientFrontierChart({ data }: EfficientFrontierChartProps) {
  const mcData = useMemo(() => {
    const step = Math.max(1, Math.ceil(data.monte_carlo.length / 500));
    return data.monte_carlo
      .filter((_, index) => index % step === 0)
      .map((p) => ({
        x: p.volatility * 100,
        y: p.expected_return * 100,
        sharpe: p.sharpe,
      }));
  }, [data.monte_carlo]);

  const frontierData = useMemo(
    () =>
      data.frontier.map((p) => ({
        x: p.volatility * 100,
        y: p.expected_return * 100,
        sharpe: p.sharpe,
      })),
    [data.frontier]
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-ff-border rounded-lg p-2 text-xs shadow-sm">
        <div className="text-ff-text">Return: {fmtPct(d.y / 100)}</div>
        <div className="text-ff-text">Vol: {fmtPct(d.x / 100)}</div>
        <div className="text-ff-text">Sharpe: {fmtNum(d.sharpe)}</div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 16, right: 24, bottom: 36, left: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis
            dataKey="x"
            type="number"
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            label={{
              value: "Volatility",
              position: "bottom",
              offset: 0,
              fill: CHART_THEME.tick,
              fontSize: 11,
            }}
            stroke={CHART_THEME.axis}
            tick={rechartsAxisTick(10)}
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
              fill: CHART_THEME.tick,
              fontSize: 11,
            }}
            stroke={CHART_THEME.axis}
            tick={rechartsAxisTick(10)}
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
              stroke={REFERENCE_STROKE}
              strokeWidth={1.5}
            />
          )}
          {data.min_vol && (
            <ReferenceDot
              x={data.min_vol.volatility * 100}
              y={data.min_vol.expected_return * 100}
              r={6}
              fill="#a855f7"
              stroke={REFERENCE_STROKE}
              strokeWidth={1.5}
            />
          )}
          {data.current && (
            <ReferenceDot
              x={data.current.volatility * 100}
              y={data.current.expected_return * 100}
              r={8}
              fill="#f97316"
              stroke={REFERENCE_STROKE}
              strokeWidth={2}
            />
          )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center mt-3 text-xs text-ff-muted">
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
