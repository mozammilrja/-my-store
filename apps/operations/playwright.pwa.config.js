import { defineConfig, devices } from "@playwright/test"

// Lets context.setOffline() reach the service worker's own requests in
// Chromium, so "offline" really is offline for it (otherwise its fetches
// still go out and the offline fallbacks are never exercised).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = "1"
import { fileURLToPath } from "node:url"

const CAMERA_FILE = fileURLToPath(new URL("./test-results/pwa-camera/slip.y4m", import.meta.url))

/*
 * The portal as an installable app, on a production build (the service
 * worker registers only there): manifest and icons, installability, what the
 * service worker caches, starting offline, the install offer on phones, and
 * the portal pages at phone, tablet and desktop widths. API: the portal
 * harness (e2e/portal/api-server.ts) on its own ports and database.
 */
const API_PORT = 9207
const MAIL_PORT = 9208
const WEB_PORT = 7141

export default defineConfig({
  testDir: "./e2e/pwa",
  outputDir: "test-results/pwa",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${WEB_PORT}`, channel: "chrome", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "pwa", testMatch: /pwa\.spec\.js$/ },
    { name: "camera-setup", testMatch: /camera\.setup\.ts$/ },
    {
      name: "camera",
      testMatch: /camera\.spec\.ts$/,
      dependencies: ["camera-setup"],
      use: {
        permissions: ["camera"],
        launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${CAMERA_FILE}`] },
      },
    },
  ],
  webServer: [
    {
      command: "node --env-file=../backend/.env --import tsx e2e/portal/api-server.ts",
      url: `http://localhost:${API_PORT}/health`,
      env: { E2E_API_PORT: String(API_PORT), E2E_MAIL_PORT: String(MAIL_PORT), E2E_WEB_ORIGIN: `http://localhost:${WEB_PORT}`, E2E_DB: "everwear_e2e_pwa" },
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "pipe",
    },
    {
      command: `npx vite build --outDir dist-pwa --emptyOutDir && npx vite preview --outDir dist-pwa --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
})
