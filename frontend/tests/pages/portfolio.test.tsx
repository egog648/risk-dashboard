import React from "react";
import PortfolioPage from "@/app/portfolio/page";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("PortfolioPage", () => {
  it("loads optimizer output and re-runs on button click", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PortfolioPage />);

    expect(await screen.findByRole("heading", { name: "Efficient Frontier" })).toBeInTheDocument();
    expect(await screen.findByText("Run Optimizer")).toBeInTheDocument();
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
  }, 20000);
});
