"use client";

import type { CyclePhase } from "@/types/assets";
import { cyclePhaseToColor, cyclePhaseToLabel } from "@/lib/utils/colorScale";

interface CycleIndicatorProps {
  phase: CyclePhase;
}

const PHASES: CyclePhase[] = ["expansion", "peak", "contraction", "trough"];

/**
 * Small circular cycle clock showing the 4-phase business cycle with the
 * current phase highlighted.
 */
export function CycleIndicator({ phase }: CycleIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {PHASES.map((p) => (
          <span
            key={p}
            className="w-2.5 h-2.5 rounded-full transition-opacity"
            style={{
              backgroundColor: cyclePhaseToColor(p),
              opacity: phase === p ? 1 : 0.25,
              outline: phase === p ? `2px solid ${cyclePhaseToColor(p)}` : "none",
              outlineOffset: "2px",
            }}
            title={cyclePhaseToLabel(p)}
          />
        ))}
      </div>
      <span
        className="text-xs font-medium"
        style={{ color: cyclePhaseToColor(phase) }}
      >
        {cyclePhaseToLabel(phase)}
      </span>
    </div>
  );
}
