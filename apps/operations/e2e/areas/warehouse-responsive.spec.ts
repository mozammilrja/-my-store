import { expect, test } from "@playwright/test"
import { layoutProblems, navReachable, WIDTHS } from "./responsive-support"

/*
 * Every warehouse floor screen at phone, tablet and laptop widths: no
 * sideways scrolling, fingertip-sized primary buttons, no zooming inputs,
 * and the navigation within reach. Runs before the workflow spec, on the
 * same seeded order, and changes nothing.
 */

test.describe.configure({ mode: "serial" })

const SCREENS = ["/warehouse", "/warehouse/dispatch", "/warehouse/stock", "/warehouse/returns"]

for (const vp of WIDTHS) {
  test(`floor screens at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp)
    await page.goto("/login")
    expect(await layoutProblems(page), `/login at ${vp.width}px`).toEqual([])
    await page.getByLabel("Email").fill("supervisor@everwear.test")
    await page.getByLabel("Password", { exact: true }).fill("floor-password-1")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible()
    for (const path of SCREENS) {
      await page.goto(path)
      await expect(page.getByRole("main").getByRole("heading").first()).toBeVisible()
      await page.waitForLoadState("networkidle")
      await navReachable(page)
      expect(await layoutProblems(page), `${path} at ${vp.width}px`).toEqual([])
    }
    // The fulfilment work screen, from the first order in the queue.
    await page.goto("/warehouse")
    const order = page.getByRole("link", { name: /FUL-/ }).first()
    if (await order.count()) {
      await order.click()
      await expect(page).toHaveURL(/\/warehouse\/fulfilments\//)
      await page.waitForLoadState("networkidle")
      expect(await layoutProblems(page), `fulfilment at ${vp.width}px`).toEqual([])
    }
    await page.goto("/account")
    await page.waitForLoadState("networkidle")
    expect(await layoutProblems(page), `/account at ${vp.width}px`).toEqual([])
  })
}
