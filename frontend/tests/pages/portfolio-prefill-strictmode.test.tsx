import React, { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PortfolioPage from "@/app/portfolio/page";
import { DEFAULT_WEIGHTS } from "@/types/portfolio";

const STORAGE_KEY = "risk-dashboard-prefill-weights";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("prefill=1"),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("portfolio prefill under React StrictMode", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("computes frontier and clears sessionStorage after success", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WEIGHTS));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <PortfolioPage />
        </QueryClientProvider>
      </StrictMode>
    );

    await waitFor(
      () => {
        expect(screen.queryByText("Computing frontier...")).not.toBeInTheDocument();
      },
      { timeout: 30000 }
    );

    expect(screen.getByRole("button", { name: /Max Sharpe/i })).toBeInTheDocument();
    expect(screen.getByText("Weights pre-filled from client portfolio outline")).toBeInTheDocument();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  }, 35000);
});
