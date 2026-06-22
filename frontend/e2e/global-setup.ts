import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const backendDir = path.join(__dirname, "..", "..", "backend");
const frontendDir = path.join(__dirname, "..");
const dataDir = path.join(backendDir, "data");
const e2eDbFile = path.join(dataDir, "e2e_test.db");
const backendPort = process.env.E2E_BACKEND_PORT || "8000";
const backendOrigin = `http://127.0.0.1:${backendPort}`;
const envLocalPath = path.join(frontendDir, ".env.local");

function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    `sqlite:///${e2eDbFile.replace(/\\/g, "/")}`
  );
}

export default async function globalSetup() {
  fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(
    envLocalPath,
    `NEXT_PUBLIC_API_URL=${backendOrigin}\n`,
    "utf8",
  );

  execSync('python -c "from app.core.database import init_db; init_db()"', {
    cwd: backendDir,
    env: {
      ...process.env,
      FRED_API_KEY: process.env.FRED_API_KEY || "ci-test-key",
      TIINGO_API_KEY: process.env.TIINGO_API_KEY || "ci-test-key",
      DATABASE_URL: resolveDatabaseUrl(),
    },
    stdio: "inherit",
  });
}
