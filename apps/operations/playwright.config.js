import { defineConfig } from "@playwright/test"

/**
 * UI tests for the admin area of the operations portal (e2e/*.spec.js), in
 * the locally installed Google Chrome.
 *
 * By default they run on their own: the real API on a throwaway database
 * (e2e/ops/api-server.ts, slot 8: `everwear_e2e_admin_ops_8`, every area
 * seeded) and a Vite server for it, signed in as that database's owner. The
 * specs create and change records, so they never point at the dev database
 * unless asked to:
 *   ADMIN_E2E_BASE_URL=http://localhost:7001 ADMIN_E2E_API_URL=http://localhost:9100 \
 *   ADMIN_E2E_EMAIL=… ADMIN_E2E_PASSWORD=… npx playwright test
 * uses servers that are already running instead.
 *
 * The page and the API must both be on "localhost": the portal's session
 * cookie is SameSite=Strict.
 */
const external = !!process.env.ADMIN_E2E_BASE_URL
const SLOT = process.env.ADMIN_E2E_SLOT ?? "8"
const API_PORT = 9194 + Number(SLOT) * 10
const WEB_PORT = 7091 + Number(SLOT)

if (!external) {
  process.env.ADMIN_E2E_BASE_URL = `http://localhost:${WEB_PORT}`
  process.env.ADMIN_E2E_API_URL = `http://localhost:${API_PORT}`
  process.env.ADMIN_E2E_EMAIL = "owner@everwear.test"
  process.env.ADMIN_E2E_PASSWORD = "ops-password-1"
}
const baseURL = process.env.ADMIN_E2E_BASE_URL

/** Only this folder's own specs: e2e/ops and any area suites have configs of their own. */
const own = /e2e[\\/][^\\/]+\.spec\.js$/

export default defineConfig({
  testDir: "./e2e",
  // Its own folder: other suites in this app run at the same time.
  outputDir: "test-results/admin",
  globalSetup: "./e2e/global-setup.js",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-1440",
      use: { viewport: { width: 1440, height: 900 } },
      testMatch: own,
      testIgnore: /(responsive|typography)\.spec\.js/,
    },
    {
      name: "typography",
      use: { viewport: { width: 1440, height: 900 } },
      testMatch: /e2e[\\/]typography\.spec\.js$/,
    },
    {
      name: "responsive",
      use: { viewport: { width: 1440, height: 900 } },
      testMatch: /e2e[\\/]responsive\.spec\.js$/,
    },
  ],
  webServer: external
    ? undefined
    : [
        {
          command: "node --env-file=../backend/.env --import tsx e2e/ops/api-server.ts",
          url: `http://127.0.0.1:${API_PORT}/health`,
          env: { E2E_API_PORT: String(API_PORT), E2E_WEB_ORIGIN: `http://localhost:${WEB_PORT}`, OPS_SLOT: SLOT, OPS_SEEDS: "" },
          reuseExistingServer: false,
          timeout: 90_000,
          stdout: "pipe",
        },
        {
          command: `npx vite --port ${WEB_PORT} --strictPort`,
          url: `http://localhost:${WEB_PORT}`,
          env: { VITE_API_URL: `http://localhost:${API_PORT}` },
          reuseExistingServer: false,
          timeout: 60_000,
        },
      ],
})
