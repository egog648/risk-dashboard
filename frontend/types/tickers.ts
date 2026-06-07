export type AssetClassKind = "equities" | "credit" | "hard_assets" | "cash";
export type ObjectiveKind = "growth" | "income" | "safety";

export interface CustomTicker {
  id: number;
  ticker: string;
  display_name: string;
  asset_class: AssetClassKind;
  primary_objective: ObjectiveKind;
  growth_pct: number;
  income_pct: number;
  safety_pct: number;
  notes: string | null;
  risk_proxy_ticker: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomTickerCreate {
  ticker: string;
  display_name: string;
  asset_class: AssetClassKind;
  primary_objective: ObjectiveKind;
  growth_pct?: number;
  income_pct?: number;
  safety_pct?: number;
  notes?: string;
  risk_proxy_ticker?: string;
}

export const ASSET_CLASS_OPTIONS: { value: AssetClassKind; label: string }[] = [
  { value: "equities", label: "Equities" },
  { value: "credit", label: "Credit / Fixed Income" },
  { value: "hard_assets", label: "Hard Assets / Alts" },
  { value: "cash", label: "Cash / Money Market" },
];

export const OBJECTIVE_OPTIONS: { value: ObjectiveKind; label: string }[] = [
  { value: "growth", label: "Growth" },
  { value: "income", label: "Income" },
  { value: "safety", label: "Safety" },
];

export function objectiveLabel(objective: ObjectiveKind): string {
  return OBJECTIVE_OPTIONS.find((o) => o.value === objective)?.label ?? objective;
}

export function objectiveColor(objective: ObjectiveKind): string {
  if (objective === "growth") return "#2a7d5f";
  if (objective === "income") return "#2a5d9f";
  return "#9f8a2a";
}
