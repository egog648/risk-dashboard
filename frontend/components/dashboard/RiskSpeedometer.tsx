"use client";

import { PieChart, Pie, Cell } from "recharts";
import { riskScoreToHex, riskScoreToLabel } from "@/lib/utils/colorScale";

interface RiskSpeedometerProps {
  score: number; // 0–100
  size?: number;
}

/**
 * Semicircular speedometer gauge built with Recharts.
 * Score 0 = green (left), 100 = red (right).
 */
export function RiskSpeedometer({ score, size = 180 }: RiskSpeedometerProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const fillAngle = (clampedScore / 100) * 180;

  const segments = [
    { value: 25, color: "#22c55e" },  // Low — green
    { value: 25, color: "#eab308" },  // Moderate — yellow
    { value: 25, color: "#f97316" },  // Elevated — orange
    { value: 25, color: "#ef4444" },  // High — red
  ];

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size * 0.44;
  const innerRadius = size * 0.30;

  return (
    <div className="flex flex-col items-center">
      <div style={{ position: "relative", width: size, height: size / 2 + 20 }}>
        <PieChart width={size} height={size / 2 + 10}>
          <Pie
            data={segments}
            cx={cx}
            cy={cy}
            startAngle={180}
            endAngle={0}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            strokeWidth={0}
            isAnimationActive={false}
          >
            {segments.map((seg, i) => (
              <Cell key={i} fill={seg.color} />
            ))}
          </Pie>
          {/* Needle */}
          <Pie
            data={[{ value: 1 }]}
            cx={cx}
            cy={cy}
            startAngle={180 - fillAngle}
            endAngle={180 - fillAngle - 3}
            innerRadius={innerRadius - 4}
            outerRadius={outerRadius + 4}
            dataKey="value"
            fill="#ffffff"
            strokeWidth={0}
            isAnimationActive
          />
        </PieChart>
        <div
          style={{
            position: "absolute",
            bottom: 4,
            width: "100%",
            textAlign: "center",
          }}
        >
          <span
            className="text-xl font-bold"
            style={{ color: riskScoreToHex(clampedScore) }}
          >
            {clampedScore.toFixed(0)}
          </span>
          <span className="text-xs text-gray-400 block">
            {riskScoreToLabel(clampedScore)} Risk
          </span>
        </div>
      </div>
    </div>
  );
}
