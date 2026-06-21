import { describe, expect, it } from "vitest";
import { mapProfileToPortfolioWeights } from "@/lib/profiler/mapProfileToPortfolioWeights";
import type { ClientProfile } from "@/types/clients";

const completeProfile: ClientProfile = {
  id: 1,
  client_id: 1,
  is_portfolio_override: false,
  answers: {
    q1: "D",
    q2: "D",
    q3: "D",
    q4: "D",
    q5: "D",
    q6: "D",
    q7: "D",
    q8: "D",
    q9: "D",
    q10: "D",
    q11: "D",
    q12: "D",
  },
  growth_pct: 70,
  income_pct: 15,
  safety_pct: 15,
  raw_aggression_pct: 100,
  governed_aggression_pct: 100,
  governor_cap_pct: 100,
  profile_label: "Growth-Oriented",
  risk_label: "Aggressive",
  questions_answered: 12,
  is_current: true,
  saved_at: "2026-01-01T00:00:00Z",
};

describe("mapProfileToPortfolioWeights", () => {
  it("returns normalized weights for a complete profile", () => {
    const weights = mapProfileToPortfolioWeights(completeProfile);
    expect(weights).not.toBeNull();
    const total = Object.values(weights!).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("returns null when fewer than 10 questions answered", () => {
    const incomplete = { ...completeProfile, questions_answered: 8 };
    expect(mapProfileToPortfolioWeights(incomplete)).toBeNull();
  });
});
