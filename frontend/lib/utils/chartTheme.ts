export const CHART_THEME = {
  grid: "#e8edf2",
  axis: "#6b8299",
  tick: "#6b8299",
  tooltip: {
    backgroundColor: "#ffffff",
    border: "1px solid #e0e8f0",
    borderRadius: 8,
    fontSize: 11,
  },
  tooltipLabel: { color: "#6b8299" },
  tooltipItem: { color: "#333333" },
  legend: { fontSize: 11, color: "#6b8299" },
} as const;

export function rechartsTooltipProps() {
  return {
    contentStyle: CHART_THEME.tooltip,
    labelStyle: CHART_THEME.tooltipLabel,
    itemStyle: CHART_THEME.tooltipItem,
  };
}

export function rechartsAxisTick(fontSize = 10) {
  return { fill: CHART_THEME.tick, fontSize };
}
