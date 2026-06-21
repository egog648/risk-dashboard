import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MarketCallouts } from "@/components/profiler/MarketCallouts";
import { fixtures } from "@/tests/mocks/fixtures";
import { server } from "@/tests/mocks/server";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1`;

describe("MarketCallouts", () => {
  it("renders market context when inverted yield curve triggers", async () => {
    server.use(
      http.get(`${BASE_URL}/credit/yield-curve`, () =>
        HttpResponse.json(fixtures.yieldCurveInverted)
      )
    );

    renderWithProviders(
      <MarketCallouts
        sleeveAllocation={{ stocks: 30, bonds: 40, alts: 5, cash: 25 }}
        safetyPct={25}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Market Context")).toBeInTheDocument();
    });
    expect(screen.getByText(/Inverted Yield Curve/)).toBeInTheDocument();
  });
});
