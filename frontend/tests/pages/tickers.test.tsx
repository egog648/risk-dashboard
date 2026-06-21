import React from "react";
import TickersPage from "@/app/tickers/page";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("TickersPage", () => {
  it("renders the vehicle registry shell", async () => {
    renderWithProviders(<TickersPage />);

    expect(
      await screen.findByRole("heading", { name: "Vehicle Registry" })
    ).toBeInTheDocument();
    expect(await screen.findByText(/No tickers yet/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("JEPI")).toBeInTheDocument();
  });

  it("adds a ticker to the registry list", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TickersPage />);

    await screen.findByRole("heading", { name: "Vehicle Registry" });

    await user.type(screen.getByPlaceholderText("JEPI"), "VTI");
    await user.type(
      screen.getByPlaceholderText("JPMorgan Equity Premium Income ETF"),
      "Vanguard Total Stock Market ETF"
    );
    await user.click(screen.getByRole("button", { name: "Add to registry" }));

    await waitFor(() => {
      expect(screen.getByText("VTI")).toBeInTheDocument();
    });
    expect(screen.getByText("Vanguard Total Stock Market ETF")).toBeInTheDocument();
  });
});
