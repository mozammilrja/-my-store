import { defineConfig, devices } from "@playwright/test"

// Lets context.setOffline() reach the service worker's own requests in
// Chromium, so "offline" really is offline for it (otherwise its fetches
// still go out and the offline fallbacks are never exercised).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1"

/*
 * The storefront as an installable app, on a production build (the service
 * worker registers only there), built into .next-pwa and served on 8011 so
 * it never touches the dev server's files. Needs the API running on 9100
 * (the build reads the catalogue) like `next build` always does.
 */
const PORT = 8011

export default defineConfig({
  testDir: "./e2e-pwa",
  outputDir: "test-results/pwa",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PORT}`, channel: "chrome", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/in`,
    env: { NEXT_DIST_DIR: ".next-pwa", NEXT_PUBLIC_BASE_URL: `http://localhost:${PORT}` },
    reuseExistingServer: false,
    timeout: 600_000,
  },
})
