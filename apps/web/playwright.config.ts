import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const repoRoot = path.join(process.cwd(), "../..");
const baseURL = "http://127.0.0.1:3010";

const databaseUrl =
  process.env.DATABASE_URL ??
  "mysql://misaki:misaki@127.0.0.1:3306/misaki";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node scripts/e2e-api-dev.mjs",
      cwd: repoRoot,
      url: "http://127.0.0.1:8080/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PORT: "8080",
        NODE_ENV: "development",
      },
    },
    {
      command: "node scripts/e2e-copy-web-env.mjs && npm run dev -w @logivoice/web",
      cwd: repoRoot,
      url: `${baseURL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
