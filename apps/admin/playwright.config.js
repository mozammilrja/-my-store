import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.ADMIN_E2E_BASE_URL ?? "http://localhost:7001"

/**
 * UI tests for the admin SPA against a running Vite dev server and Everwear API.
 * Uses the locally installed Google Chrome, so no browser download is needed.
 * Start both first: `npm run backend:dev` and `npm run admin:dev` from the repo root.
 */
export default defineConfig({
  testDir: "./e2e",
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
      testIgnore: /(responsive|typography)\.spec\.js/,
    },
    {
      name: "typography",
      use: { viewport: { width: 1440, height: 900 } },
      testMatch: /typography\.spec\.js/,
    },
    {
      name: "responsive",
      use: { viewport: { width: 1440, height: 900 } },
      testMatch: /responsive\.spec\.js/,
    },
  ],
})
