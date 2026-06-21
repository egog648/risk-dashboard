import React from "react";
import PortfolioPage from "@/app/portfolio/page";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

async function runOptimizer(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(
    () => {
      expect(screen.queryByText("Failed to compute frontier")).not.toBeInTheDocument();
    },
    { timeout: 15000 }
  );

  await user.click(screen.getByRole("button", { name: /Run Optimizer/i }));
  await waitFor(
    () => {
      expect(screen.queryByText("Failed to compute frontier")).not.toBeInTheDocument();
    },
    { timeout: 15000 }
  );
}

describe("PortfolioPage", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  it("renders the client portfolio selector", async () => {
    renderWithProviders(<PortfolioPage />);
    expect(await screen.findByLabelText(/Client Portfolio/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Manual / no portfolio" })).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "Retirement" })).toBeInTheDocument();
  });

  it("shows suggested card when a client portfolio is selected", async () => {
    mockSearchParams = new URLSearchParams("clientId=1&portfolioId=5");
    renderWithProviders(<PortfolioPage />);

    expect(await screen.findByRole("button", { name: /Suggested/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Aggressive \(100%\)/).length).toBeGreaterThanOrEqual(1);
  }, 20000);

  it("loads optimizer output and re-runs on button click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioPage />);

    expect(await screen.findByRole("heading", { name: "Efficient Frontier" })).toBeInTheDocument();
    expect(await screen.findByText("Run Optimizer")).toBeInTheDocument();
    await runOptimizer(user);

    expect(screen.getAllByText("Max Sharpe").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Min Volatility")).toBeInTheDocument();
    expect(screen.getAllByText("Current").length).toBeGreaterThanOrEqual(1);
  }, 20000);

  it("shows optimized vs current comparison when Max Sharpe card is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioPage />);

    await screen.findByRole("heading", { name: "Efficient Frontier" });
    await runOptimizer(user);

    await user.click(screen.getByRole("button", { name: /Max Sharpe/i }));

    expect(screen.getByText("Max Sharpe vs Current")).toBeInTheDocument();
    const comparisonTable = screen.getByRole("table", { name: "Portfolio comparison" });
    expect(within(comparisonTable).getByRole("columnheader", { name: "Current" })).toBeInTheDocument();
    expect(within(comparisonTable).getByRole("columnheader", { name: "Optimized" })).toBeInTheDocument();
    expect(within(comparisonTable).getByRole("columnheader", { name: "Change" })).toBeInTheDocument();
    expect(within(comparisonTable).getByText("Equities — Large Cap")).toBeInTheDocument();
  }, 20000);

  it("applies optimized weights to sliders from comparison panel", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioPage />);

    await screen.findByRole("heading", { name: "Efficient Frontier" });
    await runOptimizer(user);

    await user.click(screen.getByRole("button", { name: /Max Sharpe/i }));
    await user.click(screen.getByRole("button", { name: /Apply to sliders/i }));

    const weightsCard = screen.getByRole("heading", { name: "Portfolio Weights" }).closest("div");
    expect(weightsCard).toBeTruthy();
    expect(within(weightsCard!).getByText("35%")).toBeInTheDocument();
  }, 20000);

  it("shows current allocation breakdown without comparison columns", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioPage />);

    await screen.findByRole("heading", { name: "Efficient Frontier" });
    await runOptimizer(user);

    const currentButtons = screen.getAllByRole("button", { name: /Current/i });
    const currentCard = currentButtons.find((button) =>
      within(button).queryByText("Click to view allocation")
    );
    expect(currentCard).toBeTruthy();
    await user.click(currentCard!);

    expect(screen.getByText("Current Allocation")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Optimized" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Change" })).not.toBeInTheDocument();
  }, 20000);
});
