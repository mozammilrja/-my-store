import { test, expect } from "@playwright/test"
import { getAdminToken, seed, gotoModule } from "./helpers.js"

const SIDEBAR_SCHEMA = [
  {
    title: "Core",
    items: [
      { label: "Overview" },
      { label: "Analytics & Reports" },
    ],
  },
  {
    title: "Catalog & Inventory",
    items: [
      { label: "Products", isActive: true },
      { label: "Categories & Collections" },
      { label: "Inventory & Warehouses" },
      { label: "Purchase Orders" },
    ],
  },
  {
    title: "Fulfillment & Orders",
    items: [
      { label: "Order Management" },
      { label: "Returns & Exchanges" },
      { label: "Shipments & Dispatch" },
    ],
  },
  {
    title: "Finance & Compliance",
    items: [
      { label: "GST & Tax Invoices" },
      { label: "Payments" },
      { label: "Credit Notes & Refunds" },
    ],
  },
  {
    title: "Settings & Admin",
    items: [
      { label: "Customers & Loyalty" },
      { label: "Promotions & Coupons" },
      { label: "Users & Role Access" },
    ],
  },
]

test.describe("Sidebar Navigation Verification (Items 1, 2, 3)", () => {
  let sidebar

  test.beforeEach(async ({ page, context, request }) => {
    const token = await getAdminToken(request)
    await seed(context, { token })
    await gotoModule(page, "products")

    sidebar = page.locator("aside[aria-label='Primary']").first()
    await expect(sidebar).toBeVisible()
  })

  test("1. Sidebar structure renders correctly with Brand and Environment tag", async () => {
    // Top brand title
    const brand = sidebar.getByTitle(/AVELIQ/i).or(sidebar.getByText(/AVELIQ/i)).first()
    await expect(brand).toBeVisible()

    // Environment badge
    const envBadge = sidebar.getByText("PROD-IN-01")
    await expect(envBadge).toBeVisible()

    // Node hub selector at bottom
    const nodeHub = sidebar.getByText(/Node hub/i).first()
    await expect(nodeHub).toBeVisible()

    // Collapse toggle button at bottom
    const collapseBtn = sidebar.getByTitle(/Collapse sidebar/i).or(
      sidebar.getByRole("button", { name: /collapse/i })
    ).first()
    await expect(collapseBtn).toBeVisible()
  })

  test("2. Correct text links/buttons exist under their respective section headings", async () => {
    for (const section of SIDEBAR_SCHEMA) {
      // Heading assertion
      const heading = sidebar.getByText(new RegExp(`^${section.title}$`, "i"))
      await expect(heading, `Section heading '${section.title}' should be visible`).toBeVisible()

      // Section nav items assertion
      const sectionNav = sidebar.getByRole("navigation", { name: new RegExp(section.title, "i") })
      await expect(sectionNav).toBeVisible()

      for (const item of section.items) {
        const navItem = sectionNav.getByRole("button", { name: new RegExp(item.label, "i") }).or(
          sectionNav.getByRole("link", { name: new RegExp(item.label, "i") })
        ).first()

        await expect(navItem, `Item '${item.label}' in section '${section.title}' should exist`).toBeVisible()
      }
    }
  })

  test("3. Alert badges report the dashboard's real counts, not typed-in numbers", async ({ page }) => {
    // The nav used to carry hardcoded counts (12, 84, 19) against a store with
    // far fewer records. Each badge now reads the same figure the dashboard
    // reports, and is absent when that figure is zero.
    const attention = await page.evaluate(async () => {
      const res = await fetch(`${window.location.origin.replace("7001", "9100")}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("everwear_admin_token")}` },
      })
      return (await res.json()).attention
    })

    for (const [label, count] of [
      ["Inventory & Warehouses", attention.lowStock],
      ["Order Management", attention.toShip],
    ]) {
      const itemRow = sidebar
        .getByRole("button", { name: new RegExp(label, "i") })
        .or(sidebar.getByRole("link", { name: new RegExp(label, "i") }))
        .first()
      await expect(itemRow).toBeVisible()

      const badge = itemRow.locator("span").getByText(String(count), { exact: true })
      if (count > 0) {
        await expect(badge, `'${label}' should show its real count ${count}`).toBeVisible()
      } else {
        await expect(
          itemRow.locator("span.rounded-full"),
          `'${label}' should show no badge when the count is zero`
        ).toHaveCount(0)
      }
    }
  })

  test("4. Active/selected item ('Products') displays active visual and aria state", async () => {
    const productsItem = sidebar.getByRole("button", { name: /^Products/i }).or(
      sidebar.getByRole("link", { name: /^Products/i })
    ).first()

    await expect(productsItem).toBeVisible()
    await expect(productsItem).toHaveAttribute("aria-current", "page")
    await expect(productsItem).toHaveClass(/bg-primary-container/)
  })
})
