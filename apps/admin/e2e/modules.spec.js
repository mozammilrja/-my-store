import { test, expect } from "@playwright/test"
import {
  MODULES,
  getAdminToken,
  seed,
  watchConsole,
  gotoModule,
  pageOverflow,
  overlappingControls,
  escapingElements,
  tinyText,
  unlabelledControls,
} from "./helpers.js"

test.describe("every module renders cleanly", () => {
  for (const mod of MODULES) {
    test(`${mod.path}`, async ({ page, context, request }) => {
      await seed(context, { token: await getAdminToken(request) })
      const consoleEntries = watchConsole(page)

      await gotoModule(page, mod.path)

      const heading = page.locator("main h1").first()
      await expect(heading).toBeVisible()
      await expect(heading).toHaveText(mod.title)

      // The page title must clear the fixed header, not hide behind it.
      const headerHeight = await page
        .locator("header")
        .first()
        .evaluate((el) => el.getBoundingClientRect().height)
      const headingTop = await heading.evaluate((el) => el.getBoundingClientRect().top)
      expect(headingTop, "page title sits behind the fixed header").toBeGreaterThanOrEqual(headerHeight)

      expect(await pageOverflow(page), "page scrolls sideways").toBe(0)
      expect(await escapingElements(page), "content painted outside the viewport").toEqual([])
      expect(await overlappingControls(page), "interactive controls overlap").toEqual([])
      expect(await tinyText(page), "text rendered below 10px").toEqual([])
      expect(await unlabelledControls(page), "icon-only control with no accessible name").toEqual([])
      expect(consoleEntries, "browser console is not clean").toEqual([])
    })
  }
})

test("sidebar navigation moves between modules and marks the current one", async ({
  page,
  context,
  request,
}) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "overview")

  await expect(page.getByRole("button", { name: /^Overview/ })).toHaveAttribute(
    "aria-current",
    "page"
  )

  await page.getByRole("button", { name: /^Order Management/ }).click()
  await expect(page.locator("main h1")).toHaveText(/order management/i)
  expect(page.url()).toContain("#/order-management")
  await expect(page.getByRole("button", { name: /^Order Management/ })).toHaveAttribute(
    "aria-current",
    "page"
  )

  await page.getByRole("button", { name: /^Products/ }).click()
  await expect(page.locator("main h1")).toHaveText(/catalog/i)
  await expect(page.getByRole("button", { name: /^Overview/ })).not.toHaveAttribute(
    "aria-current",
    "page"
  )
})

test("collapsing the sidebar keeps the content aligned to it", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "overview")

  const asideWidth = () => page.locator("aside").evaluate((el) => el.getBoundingClientRect().width)
  const contentLeft = () => page.locator("main").evaluate((el) => el.getBoundingClientRect().left)

  expect(await contentLeft()).toBeCloseTo(await asideWidth(), 0)

  await page.getByRole("button", { name: "Collapse sidebar" }).click()
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible()
  await page.waitForTimeout(400)

  const collapsed = await asideWidth()
  expect(collapsed).toBeLessThan(120)
  expect(await contentLeft()).toBeCloseTo(collapsed, 0)
  expect(await pageOverflow(page)).toBe(0)
})
