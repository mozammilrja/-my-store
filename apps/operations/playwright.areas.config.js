import { defineConfig, devices } from "@playwright/test"

/*
 * Browser tests for the warehouse floor, delivery and Seller Hub areas of the
 * operations portal (these were the standalone apps' suites). Each area runs
 * on its own throwaway API and database (e2e/areas/*-api.ts) and its own copy
 * of the portal, so the three can't disturb each other. Needs MongoDB as a
 * replica set and apps/backend/.env for MONGODB_URI and JWT_SECRET.
 *
 * The session cookie is SameSite=Strict, so the portal and the API are both
 * addressed as localhost (one site), never 127.0.0.1.
 */
const AREAS = {
  warehouse: { api: 9191, web: 7111, harness: "e2e/areas/warehouse-api.ts" },
  delivery: { api: 9192, web: 7211, harness: "e2e/areas/delivery-api.ts" },
  seller: { api: 9193, web: 7311, harness: "e2e/areas/seller-api.ts" },
}

const only = process.env.AREA ? [process.env.AREA] : Object.keys(AREAS)

export default defineConfig({
  testDir: "./e2e/areas",
  // Its own folder: the portal and admin suites write to test-results/portal, /admin and /ops.
  outputDir: "test-results/areas",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: { channel: "chrome", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    {
      name: "warehouse",
      testMatch: /warehouse(-responsive)?\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chrome", baseURL: `http://localhost:${AREAS.warehouse.web}` },
    },
    {
      // A rider's phone, sharing location from Bengaluru.
      name: "delivery",
      testMatch: /delivery\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        channel: "chrome",
        baseURL: `http://localhost:${AREAS.delivery.web}`,
        geolocation: { latitude: 12.9719, longitude: 77.6412 },
        permissions: ["geolocation", "notifications"],
      },
    },
    {
      name: "seller",
      testMatch: /seller(-responsive)?\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chrome", baseURL: `http://localhost:${AREAS.seller.web}` },
    },
  ].filter((p) => only.includes(p.name)),
  webServer: only.flatMap((name) => {
    const a = AREAS[name]
    return [
      {
        command: `node --env-file=../backend/.env --import tsx ${a.harness}`,
        url: `http://127.0.0.1:${a.api}/health`,
        env: { E2E_API_PORT: String(a.api) },
        reuseExistingServer: false,
        timeout: 90_000,
        stdout: "pipe",
      },
      {
        command: `npx vite --port ${a.web} --strictPort`,
        url: `http://localhost:${a.web}`,
        env: { VITE_API_URL: `http://localhost:${a.api}` },
        reuseExistingServer: false,
        timeout: 60_000,
      },
    ]
  }),
})
