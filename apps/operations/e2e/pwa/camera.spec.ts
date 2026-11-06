import { expect, test } from "@playwright/test"
import { SLIP } from "./slip.ts"

/*
 * Scanning with the phone camera where the browser has no Barcode Detection
 * API of its own (Safari on iPhone; also Chrome on Linux, which is what runs
 * this test): the WebAssembly decoder loads from this site and reads the
 * slip from the (fake) camera, and the scan opens the order like a scanner.
 */
test("the camera reads a pick slip with the bundled decoder", async ({ page }) => {
  await page.goto("/login")
  expect(await page.evaluate(() => "BarcodeDetector" in window), "this browser has no native detector").toBe(false)
  await page.getByLabel("Email").fill("supervisor@everwear.test")
  await page.getByLabel("Password", { exact: true }).fill("portal-password-1")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible()

  const wasm = page.waitForResponse((r) => r.url().endsWith(".wasm") && new URL(r.url()).host === new URL(page.url()).host)
  const scanned = page.waitForRequest((r) => r.url().includes("/warehouse/scan/fulfilment/"))
  await page.getByRole("button", { name: "Scan with camera" }).click()
  expect((await wasm).status()).toBe(200)
  const req = await scanned
  expect(decodeURIComponent(req.url().split("/").pop()!)).toBe(SLIP)
  // There is no such order in this test store: the floor says so, as for a scanner.
  await expect(page.getByRole("alert").or(page.getByRole("status")).filter({ hasText: /not found|No /i }).first()).toBeVisible()
})
