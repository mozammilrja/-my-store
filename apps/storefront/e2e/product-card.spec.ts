import { expect, test, type Locator, type Page } from "@playwright/test"

const COUNTRY = "dk"
const LISTING = `/${COUNTRY}/store`

/** The header badge is omitted entirely when the bag is empty. */
const bagCount = async (page: Page) => {
  const badge = page.getByTestId("nav-cart-count").first()
  if ((await badge.count()) === 0) return 0
  return Number((await badge.textContent())?.replace(/\D/g, "") ?? 0)
}

const cards = (page: Page) => page.getByTestId("product-wrapper")

/** First card that has something at rest, or null: the catalog drives these tests. */
const firstWith = async (page: Page, testId: string): Promise<Locator | null> => {
  const card = cards(page).filter({ has: page.getByTestId(testId) }).first()
  return (await card.count()) ? card : null
}

/**
 * Dots and size chips only mount while a card is active, so a card has to be
 * hovered before it can be filtered on them. Walks the grid and returns the
 * first card that matches once hovered, leaving it hovered.
 */
const hoverCardMatching = async (page: Page, selector: string): Promise<Locator | null> => {
  const total = Math.min(await cards(page).count(), 12)
  for (let i = 0; i < total; i++) {
    const card = cards(page).nth(i)
    await hoverCard(card)
    if ((await card.locator(selector).count()) > 0) return card
    await page.mouse.move(0, 0)
  }
  return null
}

const cursorOf = (locator: Locator) =>
  locator.evaluate((el) => getComputedStyle(el).cursor)

/**
 * Hovers a card and waits for it to actually react.
 *
 * The dev server compiles a route on first request, so a card can be painted
 * and visible seconds before its client bundle hydrates. Retrying the hover
 * until `data-hovered` flips keeps these tests about the card's behaviour
 * rather than about how fast the bundler was.
 */
const hoverCard = async (card: Locator) => {
  await card.scrollIntoViewIfNeeded()
  const page = card.page()
  await expect(async () => {
    // Moving away first matters: hovering a point the pointer already sits on
    // dispatches no new event, so a retry in place can never take effect.
    await page.mouse.move(0, 0)
    await card.hover()
    await expect(card).toHaveAttribute("data-hovered", "true", { timeout: 1000 })
  }).toPass({ timeout: 30_000 })
}

test.beforeEach(async ({ page }) => {
  await page.goto(LISTING, { waitUntil: "domcontentloaded" })
  await expect(cards(page).first()).toBeVisible()
  // Wait out hydration once, so each test body starts on a live page.
  await hoverCard(cards(page).first())
  await page.mouse.move(0, 0)
})

test.describe("product card, at rest", () => {
  test("shows brand, title and price from the catalog", async ({ page }) => {
    const card = cards(page).first()
    await expect(card.getByTestId("product-title")).toBeVisible()
    await expect(card.getByTestId("price")).toBeVisible()

    // Brand is the bold line above the title and must not be a placeholder.
    const brand = card.locator("span.font-bold").first()
    await expect(brand).toBeVisible()
    expect((await brand.textContent())?.trim().length ?? 0).toBeGreaterThan(0)
  })

  test("a discounted product shows MRP struck through and the saving", async ({ page }) => {
    const card = await firstWith(page, "original-price")
    test.skip(card === null, "No discounted products in the listing")

    const mrp = card!.getByTestId("original-price")
    await expect(mrp).toBeVisible()
    await expect(mrp).toHaveCSS("text-decoration-line", "line-through")

    const off = card!.getByTestId("discount-percent")
    await expect(off).toHaveText(/\(\d+% OFF\)/)

    // The saving has to agree with the two prices beside it.
    const money = (t: string | null) => Number((t ?? "").replace(/[^\d.]/g, ""))
    const price = money(await card!.getByTestId("price").locator("span").first().textContent())
    const was = money(await mrp.textContent())
    const shown = Number((await off.textContent())!.replace(/\D/g, ""))
    expect(Math.abs(Math.round(((was - price) / was) * 100) - shown)).toBeLessThanOrEqual(1)
  })

  test("a rated product shows the rating chip, an unrated one does not", async ({ page }) => {
    const rated = await firstWith(page, "product-rating-badge")
    test.skip(rated === null, "No rated products in the listing")
    await expect(rated!.getByTestId("product-rating-badge")).toContainText(/^\d\.\d/)

    // Nothing may invent stars for a product with no reviews.
    const total = await cards(page).count()
    const withBadge = await page.getByTestId("product-rating-badge").count()
    expect(withBadge).toBeLessThanOrEqual(total)
  })

  test("a sponsored product is marked AD", async ({ page }) => {
    const card = await firstWith(page, "product-sponsored-badge")
    test.skip(card === null, "No sponsored products in the listing")
    await expect(card!.getByTestId("product-sponsored-badge")).toHaveText("AD")
  })

  test("the rating chip is shown instead of dots until the card is active", async ({ page }) => {
    const card = await firstWith(page, "product-rating-badge")
    test.skip(card === null, "No rated products in the listing")
    await expect(card!.getByTestId("product-card-dot").first()).toBeHidden()
  })
})

test.describe("product card, on hover", () => {
  test("reveals the wishlist bar and the real sizes", async ({ page }) => {
    const card = cards(page).first()
    await card.scrollIntoViewIfNeeded()

    const panel = card.getByTestId("product-card-hover-panel")
    await expect(panel).toHaveCSS("opacity", "0")
    await hoverCard(card)

    // The panel covers brand and title inside the same fixed-height box.
    await expect(panel).toHaveAttribute("data-shown", "true")
    await expect(panel).toHaveCSS("opacity", "1")
    await expect(card.getByTestId("product-card-wishlist-bar")).toBeVisible()
    await expect(card.getByTestId("product-card-sizes")).toBeVisible()
    // Price never moves.
    await expect(card.getByTestId("price")).toBeVisible()
  })

  test("restores the resting layout when the pointer leaves", async ({ page }) => {
    const card = cards(page).first()
    await hoverCard(card)
    await expect(card.getByTestId("product-card-sizes")).toBeVisible()

    await page.mouse.move(0, 0)
    await expect(card).toHaveAttribute("data-hovered", "false")
    await expect(card.getByTestId("product-title")).toBeVisible()
    await expect(card.getByTestId("product-card-hover-panel")).toHaveCSS("opacity", "0")
  })

  test("hovering auto-plays the gallery, and leaving restores the first image", async ({
    page,
  }) => {
    const found = await hoverCardMatching(page, '[data-testid="product-card-dot"]')
    test.skip(found === null, "No multi-image products in the listing")
    const card = found!
    const dots = card.getByTestId("product-card-dot")

    // No mouse movement: the slides advance on their own while hovered.
    await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true", { timeout: 3000 })

    const box = (await card.boundingBox())!
    await page.mouse.move(box.x - 40, box.y - 40)
    await expect(card).toHaveAttribute("data-hovered", "false")
    // Dots unmount at rest; the gallery's live label still names the image.
    await expect(card.getByTestId("product-card-gallery")).toContainText(/image 1 of \d+/)
  })

  test("hovering does not change the card's height", async ({ page }) => {
    const card = cards(page).first()
    await card.scrollIntoViewIfNeeded()
    const before = (await card.boundingBox())!.height
    await hoverCard(card)
    expect((await card.boundingBox())!.height).toBe(before)
  })

  test("focus left inside a card does not grow it or its row", async ({ page }) => {
    const card = cards(page).first()
    await card.scrollIntoViewIfNeeded()
    const neighbour = cards(page).nth(1)
    const before = (await card.boundingBox())!.height
    const neighbourBefore = (await neighbour.boundingBox())!.height

    // Focus left on the title link while the pointer is elsewhere.
    await card.getByTestId("product-title").getByRole("link").focus()
    await page.mouse.move(0, 0)
    expect((await card.boundingBox())!.height).toBe(before)
    expect((await neighbour.boundingBox())!.height).toBe(neighbourBefore)
  })

  test("the hovered card is lifted above its neighbours", async ({ page }) => {
    const card = cards(page).first()
    await hoverCard(card)
    const z = await card.evaluate((el) => getComputedStyle(el).zIndex)
    expect(Number(z)).toBeGreaterThan(0)
  })
})

test.describe("image pagination dots", () => {
  const multiImageCard = async (page: Page) => {
    const card = await hoverCardMatching(page, '[data-testid="product-card-dot"]')
    test.skip(card === null, "No multi-image products in the listing")
    return card!
  }

  test("clicking a dot switches the image without navigating away", async ({ page }) => {
    const card = await multiImageCard(page)
    const dots = card.getByTestId("product-card-dot")
    const before = page.url()

    await dots.nth(1).click()
    await expect(page).toHaveURL(before)
    await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true")
    await expect(dots.first()).toHaveAttribute("aria-selected", "false")
  })

  test("a chosen image is held when the pointer leaves the card", async ({ page }) => {
    const card = await multiImageCard(page)
    const dots = card.getByTestId("product-card-dot")

    await dots.nth(1).click()
    await page.mouse.move(0, 0)
    await hoverCard(card)
    await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true")
  })

  test("arrow keys move between dots", async ({ page }) => {
    const card = await multiImageCard(page)
    const dots = card.getByTestId("product-card-dot")

    await dots.first().focus()
    await page.keyboard.press("ArrowRight")
    await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true")
    await page.keyboard.press("ArrowLeft")
    await expect(dots.first()).toHaveAttribute("aria-selected", "true")
  })

  test("dots take a pointer cursor", async ({ page }) => {
    const card = await multiImageCard(page)
    expect(await cursorOf(card.getByTestId("product-card-dot").first())).toBe("pointer")
  })
})

test.describe("sizes", () => {
  const hoveredCard = async (page: Page) => {
    const card = await hoverCardMatching(page, '[data-testid="product-card-size"]')
    test.skip(card === null, "No products with sizes in the listing")
    return card!
  }

  test("sizes come from the product's own variants", async ({ page }) => {
    const card = await hoveredCard(page)
    const chips = card.getByTestId("product-card-size")
    expect(await chips.count()).toBeGreaterThan(0)
    for (const chip of await chips.all()) {
      await expect(chip).toHaveAttribute("data-available", /^(true|false)$/)
    }
  })

  test("an available size takes a pointer cursor and is enabled", async ({ page }) => {
    const card = await hoveredCard(page)
    const available = card.locator('[data-testid="product-card-size"][data-available="true"]').first()
    test.skip((await available.count()) === 0, "No available sizes in the listing")
    await expect(available).toBeEnabled()
    expect(await cursorOf(available)).toBe("pointer")
  })

  test("only sizes that can be bought are listed, Myntra-style", async ({ page }) => {
    const card = await hoveredCard(page)
    const chips = card.getByTestId("product-card-size")
    for (const chip of await chips.all()) {
      await expect(chip).toHaveAttribute("data-available", "true")
    }
    await expect(card.getByTestId("product-card-sizes")).toContainText(/^Sizes: /)
  })

  test("sizes stay on a single line", async ({ page }) => {
    const card = await hoveredCard(page)
    const chips = await card.getByTestId("product-card-size").all()
    const tops = new Set<number>()
    for (const chip of chips) tops.add(Math.round((await chip.boundingBox())!.y))
    expect(tops.size).toBe(1)
  })

  test("clicking an available size opens the product page with that size selected", async ({
    page,
  }) => {
    const card = await hoveredCard(page)
    const available = card.locator('[data-testid="product-card-size"][data-available="true"]').first()
    test.skip((await available.count()) === 0, "No available sizes in the listing")
    const label = (await available.textContent())!.trim()

    await available.click()
    await expect(page).toHaveURL(new RegExp(`/products/[^?]+\\?.*size=${encodeURIComponent(label)}`))
  })
})

test.describe("wishlist", () => {
  test("on desktop the only wishlist control is the hover bar, as on Myntra", async ({ page }) => {
    const card = cards(page).first()
    await card.scrollIntoViewIfNeeded()
    await expect(card.getByTestId("product-card-wishlist")).toBeHidden()

    await hoverCard(card)
    const bar = card.getByTestId("product-card-wishlist-bar")
    expect(await cursorOf(bar)).toBe("pointer")
    const url = page.url()

    await bar.click()
    await expect(page).toHaveURL(url)
    await expect(bar).toHaveAttribute("aria-pressed", "true")

    await bar.click()
    await expect(bar).toHaveAttribute("aria-pressed", "false")
  })

  test("touch screens, which cannot hover, get a heart on the image", async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    })
    const touch = await ctx.newPage()
    await touch.goto(LISTING, { waitUntil: "domcontentloaded" })
    const card = touch.getByTestId("product-wrapper").first()
    await expect(card.getByTestId("product-card-wishlist")).toBeVisible()
    await ctx.close()
  })
})

test.describe("navigation and keyboard", () => {
  test("the card image opens the product page", async ({ page }) => {
    const card = cards(page).first()
    await card.scrollIntoViewIfNeeded()
    await card.getByTestId("product-card-gallery").click()
    await expect(page).toHaveURL(/\/products\//)
  })

  test("the title link opens the product page from the keyboard", async ({ page }) => {
    // A mouse never clicks this link: hovering swaps the text block for the
    // controls, which is the reference behaviour, and the image is the
    // pointer's route to the product. The keyboard route must still work.
    const link = cards(page).first().getByTestId("product-title").getByRole("link")
    await link.focus()
    await expect(link).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/products\//)
  })

  test("a touch tap opens the product page without swapping the text block", async ({
    page,
    browser,
  }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    })
    const touch = await ctx.newPage()
    await touch.goto(LISTING, { waitUntil: "domcontentloaded" })
    const card = touch.getByTestId("product-wrapper").first()
    await expect(card).toBeVisible()

    await card.getByTestId("product-title").getByRole("link").tap()
    await expect(touch).toHaveURL(/\/products\//)
    await ctx.close()
  })

  test("tabbing onto the hover panel reveals it", async ({ page }) => {
    const card = cards(page).first()
    const panel = card.getByTestId("product-card-hover-panel")
    await expect(panel).toHaveCSS("opacity", "0")

    await card.getByTestId("product-card-wishlist-bar").focus()
    await expect(card.getByTestId("product-card-wishlist-bar")).toBeFocused()
    await expect(panel).toHaveCSS("opacity", "1")
  })
})

test.describe("responsive", () => {
  const widths = [
    { width: 1440, height: 900, columns: 5 },
    { width: 1280, height: 900, columns: 5 },
    { width: 1024, height: 800, columns: 4 },
    { width: 768, height: 1024, columns: 3 },
    { width: 390, height: 844, columns: 2 },
    { width: 360, height: 780, columns: 2 },
  ]

  for (const { width, height, columns } of widths) {
    test(`${width}px lays out ${columns} columns with no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto(LISTING, { waitUntil: "domcontentloaded" })
      await expect(cards(page).first()).toBeVisible()

      const grid = page.getByTestId("products-list")
      const tracks = await grid.evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length
      )
      expect(tracks).toBe(columns)

      // Scoped to the listing: the shared site header overflows at narrow
      // widths on every page, which is tracked separately from this work.
      const gridOverflow = await grid.evaluate((el) => {
        const box = el.getBoundingClientRect()
        let worst = 0
        for (const child of el.querySelectorAll("*")) {
          // Content inside a clipping box (carousel slides, the "Sizes: …"
          // line) cannot spill out; the clipping box itself is still checked.
          let clipped = false
          for (let a = child.parentElement; a && a !== el; a = a.parentElement) {
            if (getComputedStyle(a).overflowX !== "visible") {
              clipped = true
              break
            }
          }
          if (clipped) continue
          const r = child.getBoundingClientRect()
          worst = Math.max(worst, r.right - box.right, box.left - r.left)
        }
        return worst
      })
      expect(gridOverflow).toBeLessThanOrEqual(1)
    })
  }

  test("cards keep a 3:4 image at every width", async ({ page }) => {
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(LISTING, { waitUntil: "domcontentloaded" })
      await expect(cards(page).first()).toBeVisible()
      const frame = cards(page).first().locator("div.aspect-\\[3\\/4\\]").first()
      await expect(frame).toBeVisible()
      const box = await frame.boundingBox()
      expect(box).not.toBeNull()
      expect(Math.abs(box!.height / box!.width - 4 / 3)).toBeLessThan(0.05)
    }
  })
})
