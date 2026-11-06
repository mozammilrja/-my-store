import { expect, type Page } from "@playwright/test"

/** The widths every area screen is checked at: the common phones, a tablet and a laptop. */
export const WIDTHS = [
  { width: 360, height: 780 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
  { width: 1280, height: 860 },
]

/**
 * What a phone screen must not do: scroll sideways, paint outside the
 * viewport without a scroller to hold it, offer primary buttons smaller than
 * a fingertip (44px, phones only), or put text inputs under 16px (iOS
 * Safari zooms the page into them).
 */
export async function layoutProblems(page: Page, opts: { targets?: boolean } = {}) {
  return page.evaluate((checkTargets) => {
    const de = document.documentElement
    const vw = de.clientWidth
    const phone = vw < 640
    const problems: string[] = []
    const overflow = de.scrollWidth - vw
    if (overflow > 0) problems.push(`page scrolls sideways by ${overflow}px`)
    const clips = (el: Element) => /auto|scroll|hidden|clip/.test(getComputedStyle(el).overflowX)
    const name = (el: Element) => `${el.tagName.toLowerCase()}[${((el as HTMLElement).innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30)}]`
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2 || r.right <= vw + 1) continue
      if (getComputedStyle(el).position === "fixed") continue
      let held = false
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (clips(p)) held = true
      if (!held) problems.push(`${name(el)} paints past the right edge (${Math.round(r.right)} > ${vw})`)
    }
    if (phone && checkTargets) {
      for (const el of document.querySelectorAll("main button, main [role=button], main input[type=submit]")) {
        const r = el.getBoundingClientRect()
        if (!r.width || !(el as HTMLElement).checkVisibility?.()) continue
        // Primary actions only: the filled accent buttons.
        if (!/\bbg-accent\b/.test(String((el as HTMLElement).className))) continue
        if (r.height < 43.5) problems.push(`${name(el)} is ${Math.round(r.height)}px tall`)
      }
      for (const el of document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), select, textarea")) {
        if (!(el as HTMLElement).checkVisibility?.()) continue
        const size = parseFloat(getComputedStyle(el).fontSize)
        if (size < 16) problems.push(`${name(el)}#${el.id} text is ${size}px (iOS zooms in)`)
      }
    }
    return [...new Set(problems)].slice(0, 10)
  }, opts.targets !== false)
}

/** The page's main navigation is on screen and inside the viewport. */
export async function navReachable(page: Page) {
  const navs = page.getByRole("navigation", { name: /Main|Sections/ })
  const count = await navs.count()
  let visible = 0
  for (let i = 0; i < count; i++) {
    const box = await navs.nth(i).boundingBox()
    if (box && (await navs.nth(i).isVisible()) && box.x >= 0 && box.x + box.width <= page.viewportSize()!.width + 1) visible++
  }
  expect(visible, "a main navigation is visible").toBeGreaterThan(0)
}
