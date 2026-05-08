/**
 * Format a decimal as a percentage string.
 * e.g. 0.1234 → "12.34%"
 */
export function fmtPct(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "N/A";
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with fixed decimals.
 */
export function fmtNum(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "N/A";
  return value.toFixed(decimals);
}

/**
 * Format a risk score (0–100).
 */
export function fmtRiskScore(score: number): string {
  return score.toFixed(1);
}

/**
 * Format a sub_class key to a human-readable label.
 * e.g. "large_cap" → "Large Cap"
 */
export function fmtSubClass(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Format an ISO date string to a short date.
 * e.g. "2024-01-15T00:00:00Z" → "Jan 15, 2024"
 */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a valuation z-score with sign and label.
 * e.g. 1.5 → "+1.50 (Expensive)"
 */
export function fmtValuation(z: number | null | undefined): string {
  if (z == null) return "N/A";
  const sign = z >= 0 ? "+" : "";
  const label = z > 1.5 ? "Expensive" : z < -1.5 ? "Cheap" : "Fair";
  return `${sign}${z.toFixed(2)} (${label})`;
}
