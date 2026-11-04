import { expect, test } from "@playwright/test"
import {
  filterString,
  listingHref,
  parseFilterString,
  parseListing,
} from "../src/modules/catalog/params"

/**
 * Myntra-style listing URLs: every filter in one `f` value
 * (`Categories:shirts::Gender:men,women::Size:M`), the price range in `rf`,
 * search text in `rawQuery`, page in `p`.
 */
test.describe("filter URL format", () => {
  test("parses groups, values and Myntra's own example shape", () => {
    expect(parseFilterString("Categories:Tshirts::Gender:men women,women")).toEqual([
      { key: "Categories", values: ["Tshirts"] },
      { key: "Gender", values: ["men women", "women"] },
    ])
  })

  test("round-trips every kind of filter", () => {
    const state = parseListing({
      f: "Categories:shirts::Gender:men,women::Brand:Everwear Atelier::Size:M,L::Color:Navy::Discount:30::Rating:4::Availability:In Stock::Offers:Sale",
      rf: "Price:100000_300000",
      rawQuery: "linen",
      sort: "price_asc",
      p: "2",
    })
    expect(state.categories).toEqual(["shirts", "men", "women"])
    expect(state.brands).toEqual(["Everwear Atelier"])
    expect(state.options).toEqual(["Size:M", "Size:L", "Color:Navy"])
    expect(state).toMatchObject({
      minPrice: 100000,
      maxPrice: 300000,
      discount: 30,
      rating: 4,
      inStock: true,
      sale: true,
      q: "linen",
      sort: "price_asc",
      page: 2,
    })

    const href = listingHref("/store", state, { page: 2 })
    expect(parseListing(Object.fromEntries(new URL(href, "http://x").searchParams))).toEqual(state)
  })

  test("gender handles are written under Gender, the rest under Categories", () => {
    const state = parseListing({ f: "Categories:shirts,men" })
    expect(filterString(state)).toBe("Categories:shirts::Gender:men")
  })

  test("values containing separators survive", () => {
    const state = parseListing({})
    const href = listingHref("/store", state, { brands: ["Smith, Jones: Co"] })
    const back = parseListing(Object.fromEntries(new URL(href, "http://x").searchParams))
    expect(back.brands).toEqual(["Smith, Jones: Co"])
  })

  test("an open-ended price range keeps its one bound", () => {
    const state = parseListing({ rf: "Price:_500000" })
    expect(state.minPrice).toBeUndefined()
    expect(state.maxPrice).toBe(500000)
  })

  test("old per-filter links still work", () => {
    const state = parseListing({ category: "shirts", brand: "Levis", option: "Size:M", page: "3" })
    expect(state).toMatchObject({ categories: ["shirts"], brands: ["Levis"], options: ["Size:M"], page: 3 })
  })

  test("nothing filtered writes a bare path", () => {
    expect(listingHref("/store", parseListing({}), {})).toBe("/store")
  })
})

test.describe("filter URL in the shop", () => {
  test("a Myntra-style link filters the listing and shows its chips", async ({ page }) => {
    await page.goto("/in/store?f=Gender%3Amen")
    await expect(page.getByTestId("products-list")).toBeVisible()
    await expect(page.getByRole("link", { name: /^Men$/ }).first()).toBeVisible()
  })

  test("ticking a filter writes it into f", async ({ page }) => {
    await page.goto("/in/store")
    await page
      .locator('[aria-label="Filters"]')
      .getByRole("link", { name: "Women", exact: true })
      .click()
    await expect(page).toHaveURL(/[?&]f=Gender%3Awomen/)
  })

  test("a search lands on the filterable listing with rawQuery", async ({ page }) => {
    await page.goto("/in/search?q=linen")
    await expect(page).toHaveURL(/\/in\/store\?rawQuery=linen/)
    await expect(page.getByRole("heading", { name: /Results for .linen./ })).toBeVisible()
    await expect(page.getByTestId("products-list")).toBeVisible()
  })
})
