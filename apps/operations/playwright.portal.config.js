import { defineConfig, devices } from "@playwright/test"

/*
 * The operations portal itself, in a browser: one sign-in for every role,
 * landing pages, what each role sees, direct URLs that must not work, sign-out,
 * ended sessions, password reset by email, account security, and the old admin
 * URLs. The real API on its own database (e2e/portal/api-server.ts); needs
 * MongoDB as a replica set and apps/backend/.env for MONGODB_URI and JWT_SECRET.
 */
const API_PORT = 9197
const MAIL_PORT = 9198
const WEB_PORT = 7131

export default defineConfig({
  testDir: "./e2e/portal",
  testMatch: /\.spec\.js$/,
  outputDir: "test-results/portal",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${WEB_PORT}`, channel: "chrome", viewport: { width: 1366, height: 860 }, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    {
      command: "node --env-file=../backend/.env --import tsx e2e/portal/api-server.ts",
      url: `http://localhost:${API_PORT}/health`,
      env: { E2E_API_PORT: String(API_PORT), E2E_MAIL_PORT: String(MAIL_PORT), E2E_WEB_ORIGIN: `http://localhost:${WEB_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
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
  metadata: { apiPort: API_PORT, mailPort: MAIL_PORT },
})
