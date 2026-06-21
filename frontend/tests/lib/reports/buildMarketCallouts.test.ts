import { describe, expect, it } from "vitest";
import { buildMarketCallouts } from "@/lib/reports/buildMarketCallouts";
import {
  defaultSleeve,
  makeAsset,
  makeMarketContext,
  makeYieldCurve,
} from "@/tests/mocks/fixtures";

describe("buildMarketCallouts", () => {
  it("emits inverted yield curve callout when bonds sleeve is active", () => {
    const ctx = makeMarketContext({
      yieldCurve: makeYieldCurve(true),
    });
    const callouts = buildMarketCallouts(ctx, defaultSleeve, 20);
    expect(callouts.some((c) => c.id === "inverted-yield-curve")).toBe(true);
    expect(callouts.find((c) => c.id === "inverted-yield-curve")?.severity).toBe("warn");
  });

  it("suppresses inverted yield curve when no bond or safety exposure", () => {
    const ctx = makeMarketContext({ yieldCurve: makeYieldCurve(true) });
    const sleeve = { stocks: 80, bonds: 0, alts: 10, cash: 10 };
    const callouts = buildMarketCallouts(ctx, sleeve, 10);
    expect(callouts.some((c) => c.id === "inverted-yield-curve")).toBe(false);
  });

  it("shows inverted yield curve when safety pct is high even without bonds", () => {
    const ctx = makeMarketContext({ yieldCurve: makeYieldCurve(true) });
    const sleeve = { stocks: 50, bonds: 0, alts: 0, cash: 50 };
    const callouts = buildMarketCallouts(ctx, sleeve, 50);
    expect(callouts.some((c) => c.id === "inverted-yield-curve")).toBe(true);
  });

  it("emits elevated small-cap callout when risk score is high", () => {
    const ctx = makeMarketContext({
      equities: [
        makeAsset("large_cap", { risk_score: 40 }),
        makeAsset("mid_cap", { risk_score: 50 }),
        makeAsset("small_cap", { risk_score: 65 }),
      ],
    });
    const callouts = buildMarketCallouts(ctx, defaultSleeve, 20);
    expect(callouts.some((c) => c.id === "elevated-small-cap")).toBe(true);
  });

  it("suppresses small-cap callout when stocks sleeve is zero", () => {
    const ctx = makeMarketContext({
      equities: [
        makeAsset("large_cap", { risk_score: 40 }),
        makeAsset("small_cap", { risk_score: 70 }),
      ],
    });
    const sleeve = { stocks: 0, bonds: 60, alts: 0, cash: 40 };
    const callouts = buildMarketCallouts(ctx, sleeve, 40);
    expect(callouts.some((c) => c.id === "elevated-small-cap")).toBe(false);
  });

  it("emits wide HY spreads callout when valuation z-score is elevated", () => {
    const ctx = makeMarketContext({
      credit: [
        makeAsset("government", { asset_class: "credit" }),
        makeAsset("corporate_ig", { asset_class: "credit", risk_score: 35 }),
        makeAsset("corporate_hy", {
          asset_class: "credit",
          risk_score: 48,
          metrics: { valuation_score: 2.0 },
        }),
      ],
    });
    const callouts = buildMarketCallouts(ctx, defaultSleeve, 20);
    expect(callouts.some((c) => c.id === "wide-hy-spreads")).toBe(true);
  });

  it("emits credit contraction callout", () => {
    const ctx = makeMarketContext({
      credit: [
        makeAsset("government", { asset_class: "credit" }),
        makeAsset("corporate_ig", { asset_class: "credit", cycle_phase: "contraction" }),
        makeAsset("corporate_hy", { asset_class: "credit", risk_score: 55 }),
      ],
    });
    const callouts = buildMarketCallouts(ctx, defaultSleeve, 20);
    expect(callouts.some((c) => c.id === "credit-contraction")).toBe(true);
  });

  it("emits stale data notice when overall status is stale", () => {
    const ctx = makeMarketContext({
      dataStatus: {
        overall_status: "stale",
        as_of: "2026-05-08T12:00:00Z",
        series: [],
      },
    });
    const callouts = buildMarketCallouts(ctx, defaultSleeve, 20);
    expect(callouts.some((c) => c.id === "stale-market-data")).toBe(true);
  });

  it("caps callouts at three and prioritizes warnings", () => {
    const ctx = makeMarketContext({
      yieldCurve: makeYieldCurve(true),
      equities: [
        makeAsset("large_cap", { risk_score: 40 }),
        makeAsset("small_cap", { risk_score: 70 }),
      ],
      credit: [
        makeAsset("corporate_ig", { asset_class: "credit", cycle_phase: "contraction" }),
        makeAsset("corporate_hy", {
          asset_class: "credit",
          risk_score: 60,
          metrics: { valuation_score: 2.5 },
        }),
      ],
      dataStatus: {
        overall_status: "stale",
        as_of: "2026-05-08T12:00:00Z",
        series: [],
      },
    });
    const callouts = buildMarketCallouts(ctx, defaultSleeve, 20);
    expect(callouts.length).toBe(3);
    expect(callouts.filter((c) => c.severity === "warn").length).toBeGreaterThan(0);
    expect(callouts[0].severity).toBe("warn");
  });
});
