import { expect, test, type APIRequestContext } from "@playwright/test";

const backendPort = process.env.E2E_BACKEND_PORT || "8000";
const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || `http://127.0.0.1:${backendPort}`;
const API_BASE = `${BACKEND_BASE}/api/v1`;
const HEALTH_URL = `${BACKEND_BASE}/health`;
const DEFAULT_WEIGHTS = {
  equities_large: 0.2,
  equities_mid: 0.05,
  equities_small: 0.05,
  credit_government: 0.2,
  credit_corporate_ig: 0.1,
  credit_corporate_hy: 0.0,
  hard_assets_gold: 0.1,
  hard_assets_reits: 0.1,
  hard_assets_commodities: 0.05,
  cash: 0.15,
};

const MOCK_FRONTIER_RESPONSE = {
  frontier: [
    {
      expected_return: 0.07,
      volatility: 0.11,
      sharpe: 0.63,
      weights: DEFAULT_WEIGHTS,
    },
  ],
  max_sharpe: {
    expected_return: 0.09,
    volatility: 0.12,
    sharpe: 0.75,
    weights: DEFAULT_WEIGHTS,
  },
  min_vol: {
    expected_return: 0.05,
    volatility: 0.07,
    sharpe: 0.5,
    weights: DEFAULT_WEIGHTS,
  },
  current: {
    expected_return: 0.08,
    volatility: 0.1,
    sharpe: 0.7,
    weights: DEFAULT_WEIGHTS,
  },
  monte_carlo: [
    {
      expected_return: 0.08,
      volatility: 0.13,
      sharpe: 0.62,
      weights: DEFAULT_WEIGHTS,
    },
  ],
  correlation_matrix: {
    equities_large: { equities_large: 1, cash: 0.1 },
    cash: { equities_large: 0.1, cash: 1 },
  },
};

async function waitForBackendHealth(request: APIRequestContext) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await request.get(HEALTH_URL);
      if (response.ok()) {
        const payload = await response.json();
        if (payload?.status === "ok") {
          return;
        }
      }
    } catch {
      // Backend still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Timed out waiting for backend health");
}

async function waitForDataStatusOkOrStale(request: APIRequestContext) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const statusResponse = await request.get(`${API_BASE}/data-status`);
    if (statusResponse.ok()) {
      const payload = await statusResponse.json();
      if (payload?.overall_status && payload.overall_status !== "error") {
        return payload.overall_status as string;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Timed out waiting for non-error data status");
}

test("refresh -> verify status -> overview -> run optimizer", async ({ page, request }) => {
  await page.route("**/portfolio/frontier**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_FRONTIER_RESPONSE),
    });
  });

  await waitForBackendHealth(request);

  const refreshResponse = await request.post(`${API_BASE}/data-status/refresh`);
  expect(refreshResponse.ok()).toBeTruthy();

  const status = await waitForDataStatusOkOrStale(request);
  expect(["ok", "stale"]).toContain(status);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("overview-heading")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Equities" })).toBeVisible({ timeout: 60_000 });

  await page.goto("/portfolio", { waitUntil: "networkidle", timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Portfolio Optimizer" })).toBeVisible();

  const runButton = page.getByRole("button", { name: "Run Optimizer" });
  await expect(runButton).toBeEnabled({ timeout: 60_000 });
  await runButton.scrollIntoViewIfNeeded();
  await runButton.click();

  await expect(page.getByText("Max Sharpe")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Failed to compute frontier")).not.toBeVisible();
});
