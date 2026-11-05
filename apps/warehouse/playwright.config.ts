import { defineConfig, devices } from "@playwright/test"

/*
 * Browser tests for the warehouse app against the real API (e2e/api-server.ts,
 * its own throwaway database and the courier stand-in). Needs MongoDB running
 * as a replica set and apps/backend/.env for MONGODB_URI and JWT_SECRET.
 * The tests run in order: they share one seeded order moving through the floor.
 */
const API_PORT = 9191

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:7101",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  webServer: [
    {
      command: `node --env-file=../backend/.env --import tsx e2e/api-server.ts`,
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: { E2E_API_PORT: String(API_PORT) },
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "pipe",
    },
    {
      command: "npx vite --port 7101 --strictPort",
      url: "http://localhost:7101",
      env: { VITE_API_URL: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
