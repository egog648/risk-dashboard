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
 * Format a sub_class key to a human-readable label.
 * e.g. "large_cap" → "Large Cap"
 */
export function fmtSubClass(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
