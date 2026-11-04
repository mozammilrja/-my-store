import { chromium, request as pwRequest } from "@playwright/test"
import { getAdminToken, seed, MODULES } from "./helpers.js"

/**
 * Visits every module once before the suite runs.
 *
 * Each module is a lazy chunk, and the dev server compiles it the first time
 * it is asked for. That first compile lands on whichever test happens to open
 * the module first, and under the load of a full run it could outrun the
 * assertion waiting for the page heading. The failure moved between modules
 * from run to run and never reproduced on its own, which is exactly what a
 * cold start looks like.
 *
 * Warming them here removes the variance rather than hiding it behind a longer
 * timeout.
 */
export default async function globalSetup(config) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:7001"
  const api = await pwRequest.newContext()
  const token = await getAdminToken(api)

  const browser = await chromium.launch({ channel: "chrome" })
  const context = await browser.newContext({ baseURL })
  await seed(context, { token })
  const page = await context.newPage()

  for (const { path } of MODULES) {
    await page.goto(`/${path}`, { waitUntil: "networkidle" }).catch(() => {})
  }
  // The product editor's panels are chunks of their own.
  for (const tab of ["media", "variants", "pricing", "tax", "stock", "storefront"]) {
    await page.goto(`/products?tab=${tab}`, { waitUntil: "networkidle" }).catch(() => {})
  }

  await browser.close()
  await api.dispose()
}
