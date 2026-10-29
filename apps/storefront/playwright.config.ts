import { defineConfig } from "@playwright/test"

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:8001"

/**
 * End-to-end tests against a running storefront and Everwear API.
 * Uses the locally installed Google Chrome, so no browser download is needed.
 * Start both apps first: `npm run dev` from the repo root.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
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
      name: "desktop",
      use: { viewport: { width: 1440, height: 900 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
})
