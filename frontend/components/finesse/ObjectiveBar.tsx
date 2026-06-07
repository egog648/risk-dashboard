interface ObjectiveBarProps {
  label: string;
  sublabel?: string;
  pct: number;
  color: string;
}

export function ObjectiveBar({ label, sublabel, pct, color }: ObjectiveBarProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold text-ff-navy">
          {label}
          {sublabel && (
            <span className="font-normal text-ff-muted"> ({sublabel})</span>
          )}
        </span>
        <span className="text-sm font-extrabold" style={{ color }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="w-full h-2.5 bg-[#e8edf2] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export const OBJECTIVE_COLORS = {
  growth: "#2a7d5f",
  income: "#2a5d9f",
  safety: "#9f8a2a",
} as const;
