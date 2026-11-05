import { defineConfig, devices } from "@playwright/test"

/*
 * Browser tests for the rider app against the real API (e2e/api-server.ts:
 * its own throwaway database, no courier integration). Needs MongoDB as a
 * replica set and apps/backend/.env for MONGODB_URI and JWT_SECRET. Runs on
 * a phone-sized viewport with location permission granted at a Bengaluru
 * position. Tests share one seeded run, in order.
 */
const API_PORT = 9192

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    ...devices["Pixel 7"],
    baseURL: "http://localhost:7201",
    channel: "chrome",
    geolocation: { latitude: 12.9719, longitude: 77.6412 },
    permissions: ["geolocation", "notifications"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" } }],
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
      command: "npx vite --port 7201 --strictPort",
      url: "http://localhost:7201",
      env: { VITE_API_URL: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
