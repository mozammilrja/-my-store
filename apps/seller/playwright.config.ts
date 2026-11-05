import { defineConfig, devices } from "@playwright/test"

/*
 * Browser tests for the seller hub against the real API (e2e/api-server.ts:
 * its own throwaway database, no providers). Needs MongoDB as a
 * replica set and apps/backend/.env for MONGODB_URI and JWT_SECRET. Runs on
 * a desktop viewport. Tests share one seeded run, in order.
 */
const API_PORT = 9193

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:7301",
    channel: "chrome",
    
    
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: [
    {
      command: "node --env-file=../backend/.env --import tsx e2e/api-server.ts",
      url: `http://127.0.0.1:${API_PORT}/health`,
      env: { E2E_API_PORT: String(API_PORT) },
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: "pipe",
    },
    {
      command: "npx vite --port 7301 --strictPort",
      url: "http://localhost:7301",
      env: { VITE_API_URL: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
