import { describe, expect, it } from "vitest";
import { computeScores, getProfileLabel, getRiskLabel } from "@/lib/profiler/scoring";
import { buildAdvisorReport } from "@/lib/profiler/report";
import { mapToPortfolioWeights } from "@/lib/profiler/mapToPortfolioWeights";
import type { ProfilerAnswers } from "@/lib/profiler/questions";

// All D answers: max growth, max aggression, no governor cap
const ALL_D: ProfilerAnswers = {
  1: 3, 2: 3, 3: 3, 4: 3, 5: 3,
  6: 3, 7: 3, 8: 3, 9: 3, 10: 3,
  11: 3, 12: 3,
};

// All A answers: max safety, min aggression, governor cap 30
const ALL_A: ProfilerAnswers = {
  1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
  11: 0, 12: 0,
};

describe("computeScores", () => {
  it("computes growth-dominant triangle for all-D answers", () => {
    const sc = computeScores(ALL_D);
    expect(sc.g).toBeGreaterThan(0.8);
    expect(sc.g).toBeGreaterThan(sc.i);
    expect(sc.g).toBeGreaterThan(sc.s);
    expect(sc.rawAgg).toBe(100);
    expect(sc.govAgg).toBe(100);
    expect(sc.cap).toBe(100);
    expect(sc.totalAns).toBe(12);
  });

  it("computes safety-dominant triangle for all-A answers", () => {
    const sc = computeScores(ALL_A);
    expect(sc.s).toBeGreaterThan(0.5);
    expect(sc.s).toBeGreaterThan(sc.g);
    expect(sc.s).toBeGreaterThan(sc.i);
    expect(sc.rawAgg).toBe(0);
    expect(sc.govAgg).toBe(0);
    expect(sc.cap).toBe(30);
    expect(sc.totalAns).toBe(12);
  });

  it("applies governor cap when risk exceeds safeguards", () => {
    const answers: ProfilerAnswers = {
      ...ALL_D,
      11: 0, // cap 30
      12: 0, // cap 40 → min is 30
    };
    const sc = computeScores(answers);
    expect(sc.rawAgg).toBe(100);
    expect(sc.govAgg).toBe(30);
    expect(sc.cap).toBe(30);
  });

  it("returns zero scores for empty answers", () => {
    const sc = computeScores({});
    expect(sc.g).toBe(0);
    expect(sc.i).toBe(0);
    expect(sc.s).toBe(0);
    expect(sc.totalAns).toBe(0);
  });
});

describe("getProfileLabel", () => {
  it("labels growth-oriented profiles", () => {
    expect(getProfileLabel(65, 20, 15)).toBe("Growth-Oriented");
  });

  it("labels balanced profiles", () => {
    expect(getProfileLabel(33, 33, 34)).toBe("Balanced");
  });
});

describe("getRiskLabel", () => {
  it("labels aggressive risk", () => {
    expect(getRiskLabel(85)).toBe("Aggressive");
  });

  it("labels conservative risk", () => {
    expect(getRiskLabel(15)).toBe("Conservative");
  });
});

describe("buildAdvisorReport", () => {
  it("returns null when fewer than 10 questions answered", () => {
    expect(buildAdvisorReport({ 1: 0, 2: 0 })).toBeNull();
  });

  it("generates report for complete questionnaire", () => {
    const report = buildAdvisorReport(ALL_D, "Test Client");
    expect(report).not.toBeNull();
    expect(report!.clientName).toBe("Test Client");
    expect(report!.profileLabel).toBe("Growth-Oriented");
    expect(report!.riskLabel).toBe("Aggressive");
    expect(report!.eqVehicles.length).toBeGreaterThan(0);
  });
});

describe("mapToPortfolioWeights", () => {
  it("returns normalized weights summing to 1", () => {
    const weights = mapToPortfolioWeights(ALL_D);
    const total = Object.values(weights).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 4);
  });

  it("allocates more to cash for conservative profiles", () => {
    const aggressive = mapToPortfolioWeights(ALL_D);
    const conservative = mapToPortfolioWeights(ALL_A);
    expect(conservative.cash).toBeGreaterThan(aggressive.cash);
  });
});
