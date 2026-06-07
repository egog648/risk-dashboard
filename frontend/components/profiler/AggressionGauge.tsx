"use client";

import type { ProfilerScores } from "@/lib/profiler/scoring";

interface AggressionGaugeProps {
  scores: ProfilerScores;
}

function angle(v: number) {
  return -135 + (v / 100) * 270;
}

function arcPath(sa: number, ea: number, radius: number) {
  const s = ((sa - 90) * Math.PI) / 180;
  const e = ((ea - 90) * Math.PI) / 180;
  const x1 = 100 + radius * Math.cos(s);
  const y1 = 100 + radius * Math.sin(s);
  const x2 = 100 + radius * Math.cos(e);
  const y2 = 100 + radius * Math.sin(e);
  const large = ea - sa > 180 ? 1 : 0;
  return `M${x1},${y1} A${radius},${radius} 0 ${large} 1 ${x2},${y2}`;
}

export function AggressionGauge({ scores }: AggressionGaugeProps) {
  const hue = 210 - scores.govAgg * 1.8;
  const na = angle(scores.govAgg);
  const nx = 100 + 55 * Math.cos(((na - 90) * Math.PI) / 180);
  const ny = 100 + 55 * Math.sin(((na - 90) * Math.PI) / 180);

  let capMark = null;
  if (scores.cap < 100) {
    const ca = angle(scores.cap);
    const cx1 = 100 + 58 * Math.cos(((ca - 90) * Math.PI) / 180);
    const cy1 = 100 + 58 * Math.sin(((ca - 90) * Math.PI) / 180);
    const cx2 = 100 + 82 * Math.cos(((ca - 90) * Math.PI) / 180);
    const cy2 = 100 + 82 * Math.sin(((ca - 90) * Math.PI) / 180);
    const tx = 100 + 92 * Math.cos(((ca - 90) * Math.PI) / 180);
    const ty = 100 + 92 * Math.sin(((ca - 90) * Math.PI) / 180);
    capMark = (
      <>
        <line x1={cx1} y1={cy1} x2={cx2} y2={cy2} stroke="#c0392b" strokeWidth="3" strokeLinecap="round" />
        <text x={tx} y={ty} textAnchor="middle" fontSize="8" fill="#c0392b" fontWeight="700">
          CAP
        </text>
      </>
    );
  }

  return (
    <div className="text-center">
      <svg viewBox="-30 0 260 158" className="w-full max-w-[300px] mx-auto">
        {scores.cap < 100 && scores.rawAgg !== scores.govAgg && (
          <text x="-24" y="14" textAnchor="start" fontSize="8" fill="#c0392b" fontWeight="600">
            ⚠ raw {Math.round(scores.rawAgg)}% → capped {Math.round(scores.govAgg)}%
          </text>
        )}
        <path d={arcPath(-135, 135, 70)} fill="none" stroke="#e8edf2" strokeWidth="14" strokeLinecap="round" />
        {scores.govAgg > 0 && (
          <path
            d={arcPath(-135, angle(scores.govAgg), 70)}
            fill="none"
            stroke={`hsl(${hue},70%,50%)`}
            strokeWidth="14"
            strokeLinecap="round"
          />
        )}
        {capMark}
        <line x1="100" y1="100" x2={nx} y2={ny} stroke="#1a3a5c" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="100" cy="100" r="5" fill="#1a3a5c" />
        <text x="100" y="130" textAnchor="middle" fontSize="20" fontWeight="800" fill="#1a3a5c">
          {Math.round(scores.govAgg)}%
        </text>
        <text x="-20" y="142" textAnchor="start" fontSize="8" fill="#8899aa">
          Conservative
        </text>
        <text x="220" y="142" textAnchor="end" fontSize="8" fill="#8899aa">
          Aggressive
        </text>
      </svg>
    </div>
  );
}
