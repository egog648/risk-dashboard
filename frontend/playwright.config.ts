import fs from "fs";
import path from "path";
import { defineConfig } from "@playwright/test";

const backendDir = path.resolve(__dirname, "..", "backend");
const backendPort = process.env.E2E_BACKEND_PORT || "8000";
const frontendPort = process.env.E2E_FRONTEND_PORT || "3000";
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const frontendOrigin = `http://127.0.0.1:${frontendPort}`;

function loadBackendDotEnv(): Record<string, string> {
  const envPath = path.join(backendDir, ".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const backendDotEnv = loadBackendDotEnv();
const reuseServers = process.env.PW_REUSE_SERVER === "1";
const e2eDbFile = path.join(backendDir, "data", "e2e_test.db");
const e2eDatabaseUrl =
  process.env.DATABASE_URL ||
  `sqlite:///${e2eDbFile.replace(/\\/g, "/")}`;

const backendEnv = {
  FRED_API_KEY:
    process.env.FRED_API_KEY || backendDotEnv.FRED_API_KEY || "ci-test-key",
  TIINGO_API_KEY:
    process.env.TIINGO_API_KEY || backendDotEnv.TIINGO_API_KEY || "ci-test-key",
  DATABASE_URL: e2eDatabaseUrl,
  APP_ENV: "development",
  CORS_ORIGINS: JSON.stringify([
    frontendOrigin,
    `http://localhost:${frontendPort}`,
    backendOrigin,
  ]),
};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 300_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: frontendOrigin,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `python -m uvicorn app.main:app --host 127.0.0.1 --port ${backendPort}`,
      cwd: backendDir,
      url: `${backendOrigin}/health`,
      reuseExistingServer: reuseServers,
      timeout: 120_000,
      env: backendEnv,
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${frontendPort}`,
      url: frontendOrigin,
      reuseExistingServer: reuseServers,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: backendOrigin,
      },
    },
  ],
});
