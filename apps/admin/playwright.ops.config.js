import { defineConfig, devices } from "@playwright/test"

/*
 * Browser tests for the operations screens (e2e/ops/*.ops.js) against the
 * real API on its own throwaway database (e2e/ops/api-server.ts), unlike
 * the main suite, which uses a running dev API. Needs MongoDB as a replica
 * set and apps/backend/.env for MONGODB_URI and JWT_SECRET.
 *   npx playwright test -c playwright.ops.config.js
 * OPS_SLOT=1..9 runs on its own ports and database, so runs can overlap;
 * OPS_SEEDS=fleet,notifications seeds only those areas.
 */
const SLOT = Number(process.env.OPS_SLOT ?? 0)
const API_PORT = 9194 + SLOT * 10
const WEB_PORT = 7091 + SLOT

export default defineConfig({
  testDir: "./e2e/ops",
  testMatch: /.*\.ops\.js/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, baseURL: `http://localhost:${WEB_PORT}`, channel: "chrome", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    {
      command: "node --env-file=../backend/.env --import tsx e2e/ops/api-server.ts",
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: { E2E_API_PORT: String(API_PORT), E2E_WEB_ORIGIN: `http://localhost:${WEB_PORT}`, OPS_SLOT: process.env.OPS_SLOT ?? "", OPS_SEEDS: process.env.OPS_SEEDS ?? "" },
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: "pipe",
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_URL: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
