import React from "react";
import OverviewPage from "@/app/OverviewPage";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1`;

describe("OverviewPage", () => {
  it("renders section titles and cards from API hooks", async () => {
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByText(/Market Risk Overview/i)).toBeInTheDocument();
    expect(await screen.findByText("Equities")).toBeInTheDocument();
    expect(await screen.findByText("Credit")).toBeInTheDocument();
    expect(await screen.findByText("Hard Assets / Alts")).toBeInTheDocument();
    expect(await screen.findByText("Cash")).toBeInTheDocument();
    expect(await screen.findByText("Large Cap")).toBeInTheDocument();
  });

  it("renders an actionable error when one section fails", async () => {
    server.use(http.get(`${BASE_URL}/credit/all`, () => HttpResponse.error()));
    renderWithProviders(<OverviewPage />);

    expect(await screen.findByText(/Failed to load Credit/i)).toBeInTheDocument();
  });
});
