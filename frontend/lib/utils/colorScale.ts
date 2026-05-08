import type { CyclePhase } from "@/types/assets";

/**
 * Maps a 0-100 risk score to a Tailwind color class.
 */
export function riskScoreToColor(score: number): string {
  if (score < 25) return "text-risk-low";
  if (score < 50) return "text-risk-medium";
  if (score < 75) return "text-risk-high";
  return "text-risk-critical";
}

export function riskScoreToHex(score: number): string {
  if (score < 25) return "#22c55e";
  if (score < 50) return "#eab308";
  if (score < 75) return "#f97316";
  return "#ef4444";
}

export function riskScoreToLabel(score: number): string {
  if (score < 25) return "Low";
  if (score < 50) return "Moderate";
  if (score < 75) return "Elevated";
  return "High";
}

export function cyclePhaseToColor(phase: CyclePhase): string {
  const map: Record<CyclePhase, string> = {
    expansion: "#3b82f6",
    peak: "#a855f7",
    contraction: "#f97316",
    trough: "#22c55e",
    unknown: "#6b7280",
  };
  return map[phase];
}

export function cyclePhaseToLabel(phase: CyclePhase): string {
  const map: Record<CyclePhase, string> = {
    expansion: "Expansion",
    peak: "Peak",
    contraction: "Contraction",
    trough: "Trough",
    unknown: "Unknown",
  };
  return map[phase];
}

/**
 * Returns a Tremor color string for use in <Badge> or <ProgressBar>.
 */
export function riskScoreToTremorColor(
  score: number
): "green" | "yellow" | "orange" | "red" {
  if (score < 25) return "green";
  if (score < 50) return "yellow";
  if (score < 75) return "orange";
  return "red";
}
