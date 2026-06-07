"use client";

import type { ProfilerScores } from "@/lib/profiler/scoring";

interface TriangleChartProps {
  scores: ProfilerScores;
}

export function TriangleChart({ scores }: TriangleChartProps) {
  const cx = 240;
  const cy = 195;
  const r = 150;
  const vG = { x: cx, y: cy - r };
  const vI = { x: cx + r * Math.cos(Math.PI / 6), y: cy + r * Math.sin(Math.PI / 6) };
  const vS = { x: cx - r * Math.cos(Math.PI / 6), y: cy + r * Math.sin(Math.PI / 6) };

  const hue = 210 - scores.govAgg * 1.8;
  const dotColor = `hsl(${hue},75%,45%)`;
  const ringColor = `hsl(${hue},85%,55%)`;
  const ringR = 12 + scores.govAgg * 0.14;
  const ringW = 2 + scores.govAgg * 0.03;
  const px = scores.g * vG.x + scores.i * vI.x + scores.s * vS.x;
  const py = scores.g * vG.y + scores.i * vI.y + scores.s * vS.y;
  const dash = scores.govAgg > 70 ? undefined : "5,3";

  const gridLines = [0.25, 0.5, 0.75].map((t) => {
    const iG = { x: cx + (vG.x - cx) * t, y: cy + (vG.y - cy) * t };
    const iI = { x: cx + (vI.x - cx) * t, y: cy + (vI.y - cy) * t };
    const iS = { x: cx + (vS.x - cx) * t, y: cy + (vS.y - cy) * t };
    return (
      <polygon
        key={t}
        points={`${iG.x},${iG.y} ${iI.x},${iI.y} ${iS.x},${iS.y}`}
        fill="none"
        stroke="#1a3a5c"
        strokeWidth="0.5"
        strokeOpacity="0.15"
        strokeDasharray="4,4"
      />
    );
  });

  return (
    <div className="text-center">
      <svg viewBox="0 0 480 430" className="w-full max-w-[420px] mx-auto">
        <defs>
          <linearGradient id="triFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a3a5c" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#1a3a5c" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        {gridLines}
        <polygon
          points={`${vG.x},${vG.y} ${vI.x},${vI.y} ${vS.x},${vS.y}`}
          fill="url(#triFill)"
          stroke="#1a3a5c"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text x={vG.x} y={vG.y - 26} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1a3a5c">
          GROWTH
        </text>
        <text x={vG.x} y={vG.y - 12} textAnchor="middle" fontSize="11" fill="#6b8299">
          Equities
        </text>
        <text x={vI.x + 18} y={vI.y + 18} textAnchor="start" fontSize="13" fontWeight="700" fill="#1a3a5c">
          INCOME
        </text>
        <text x={vI.x + 18} y={vI.y + 33} textAnchor="start" fontSize="11" fill="#6b8299">
          Fixed Income
        </text>
        <text x={vS.x - 18} y={vS.y + 18} textAnchor="end" fontSize="13" fontWeight="700" fill="#1a3a5c">
          SAFETY
        </text>
        <text x={vS.x - 18} y={vS.y + 33} textAnchor="end" fontSize="11" fill="#6b8299">
          Cash / MM
        </text>
        {scores.sum > 0 && (
          <>
            <circle
              cx={px}
              cy={py}
              r={ringR}
              fill="none"
              stroke={ringColor}
              strokeWidth={ringW}
              strokeDasharray={dash}
              opacity="0.7"
            />
            <circle cx={px} cy={py} r="7" fill={dotColor} stroke="#fff" strokeWidth="2.5" />
          </>
        )}
      </svg>
      {scores.sum > 0 && (
        <div className="flex justify-center gap-5 mt-1 mb-2">
          <span className="text-[13px] font-bold text-ff-green">{Math.round(scores.g * 100)}% G</span>
          <span className="text-[13px] font-bold text-ff-blue">{Math.round(scores.i * 100)}% I</span>
          <span className="text-[13px] font-bold text-ff-gold">{Math.round(scores.s * 100)}% S</span>
        </div>
      )}
    </div>
  );
}
