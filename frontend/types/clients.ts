import type { PortfolioWeights } from "./portfolio";

export interface Client {
  id: number;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  current_profile_id: number | null;
  portfolio_count: number;
}

export interface ClientCreate {
  name: string;
  notes?: string | null;
}

export interface ClientProfile {
  id: number;
  client_id: number;
  is_portfolio_override: boolean;
  answers: Record<string, string>;
  growth_pct: number;
  income_pct: number;
  safety_pct: number;
  raw_aggression_pct: number;
  governed_aggression_pct: number;
  governor_cap_pct: number;
  profile_label: string;
  risk_label: string;
  questions_answered: number;
  is_current: boolean;
  saved_at: string;
}

export interface ClientProfileCreate {
  answers: Record<string, string>;
  growth_pct: number;
  income_pct: number;
  safety_pct: number;
  raw_aggression_pct: number;
  governed_aggression_pct: number;
  governor_cap_pct: number;
  profile_label: string;
  risk_label: string;
  questions_answered: number;
}

export interface Portfolio {
  id: number;
  client_id: number;
  name: string;
  notes: string | null;
  profile_override_id: number | null;
  effective_profile_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioCreate {
  name: string;
  notes?: string | null;
}

export interface SleeveAllocation {
  stocks: number;
  bonds: number;
  alts: number;
  cash: number;
}

export interface VehicleSuggestion {
  name: string;
  pct: number;
}

export type OutlineStatus = "draft" | "presented" | "implemented";

export interface PortfolioOutline {
  id: number;
  portfolio_id: number;
  profile_id: number;
  sleeve_allocation: SleeveAllocation;
  weights: PortfolioWeights;
  vehicles: Record<string, VehicleSuggestion[]>;
  narrative: string;
  status: OutlineStatus;
  created_at: string;
}
