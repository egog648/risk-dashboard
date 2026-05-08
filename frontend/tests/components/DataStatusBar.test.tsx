import React from "react";
import { http, HttpResponse } from "msw";
import { DataStatusBar } from "@/components/layout/DataStatusBar";
import { server } from "@/tests/mocks/server";
import { renderWithProviders } from "@/tests/utils/renderWithProviders";
import { screen } from "@testing-library/react";

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1`;

describe("DataStatusBar", () => {
  it("renders current-data text for ok status", async () => {
    renderWithProviders(<DataStatusBar />);
    expect(await screen.findByText(/Data current/i)).toBeInTheDocument();
  });

  it("renders stale text for stale status", async () => {
    server.use(
      http.get(`${BASE_URL}/data-status`, () =>
        HttpResponse.json({ overall_status: "stale", as_of: "2026-05-08T12:00:00Z" })
      )
    );

    renderWithProviders(<DataStatusBar />);
    expect(await screen.findByText(/Some data stale/i)).toBeInTheDocument();
  });
});
