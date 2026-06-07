import type { ObjectiveKind } from "@/types/tickers";
import { objectiveColor, objectiveLabel } from "@/types/tickers";

export function ObjectiveBadge({ objective }: { objective: ObjectiveKind }) {
  const color = objectiveColor(objective);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {objectiveLabel(objective)}
    </span>
  );
}
