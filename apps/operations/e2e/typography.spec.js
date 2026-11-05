import { test, expect } from "@playwright/test"
import { MODULES, getAdminToken, seed, gotoModule } from "./helpers.js"

/**
 * The approved type scale, as rendered. Anything outside it means a component
 * invented its own size instead of taking one from the scale.
 */
const TEXT_SIZES = ["36px", "28px", "24px", "22px", "20px", "16px", "14px", "13px", "12px", "11px"]
const ICON_SIZES = ["14px", "16px", "18px", "20px", "24px", "32px"]
const WEIGHTS = ["400", "500", "600"]

/** Collects every typography and colour violation on the current page. */
const AUDIT = ([textSizes, iconSizes, weights]) => {
  const SCALE = new Set(textSizes)
  const ICON = new Set(iconSizes)
  const W = new Set(weights)
  const out = {
    badSize: [], badWeight: [], badFamily: [], tiny: [],
    lowContrast: [], wrap3: [], clipped: [], headerWeak: [],
  }

  const rgba = (v) => {
    const m = (v || "").match(/[\d.]+/g)
    if (!m) return null
    const [r, g, b, a = 1] = m.map(Number)
    return { r, g, b, a }
  }
  const lumOf = ({ r, g, b }) => {
    const ch = (c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
  }
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

  /** Composites the background stack; returns null over imagery, which cannot be measured. */
  const bgOf = (el) => {
    const stack = []
    for (let p = el; p; p = p.parentElement) {
      const cs = getComputedStyle(p)
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null
      const c = rgba(cs.backgroundColor)
      if (c && c.a > 0) {
        stack.push(c)
        if (c.a >= 0.999) break
      }
    }
    if (!stack.length) return 1
    let acc = stack.pop()
    while (stack.length) {
      const top = stack.pop()
      acc = {
        r: top.r * top.a + acc.r * (1 - top.a),
        g: top.g * top.a + acc.g * (1 - top.a),
        b: top.b * top.a + acc.b * (1 - top.a),
        a: 1,
      }
    }
    return lumOf(acc)
  }

  const label = (el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 44)}`

  for (const el of document.querySelectorAll("main *, header *, aside *")) {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (cs.visibility === "hidden" || cs.display === "none") continue

    if (el.classList.contains("material-symbols-outlined")) {
      if (!ICON.has(cs.fontSize)) out.badSize.push(`icon ${cs.fontSize} ${label(el)}`)
      continue
    }

    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!ownText) continue
    const text = el.textContent.trim().slice(0, 28)
    const px = parseFloat(cs.fontSize)
    const family = cs.fontFamily.split(",")[0].replace(/['"]/g, "").trim()

    if (!SCALE.has(cs.fontSize)) out.badSize.push(`${cs.fontSize} "${text}" ${label(el)}`)
    if (!W.has(cs.fontWeight)) out.badWeight.push(`${cs.fontWeight} "${text}" ${label(el)}`)
    if (family !== "Inter" && !/mono|SFMono|Menlo/i.test(family)) out.badFamily.push(`${family} "${text}"`)
    if (px < 11) out.tiny.push(`${cs.fontSize} "${text}" ${label(el)}`)

    const fg = rgba(cs.color)
    const bg = bgOf(el)
    if (fg && bg !== null && cs.opacity === "1") {
      const cr = ratio(lumOf(fg), bg)
      const large = px >= 18 || (px >= 14 && Number(cs.fontWeight) >= 700)
      const need = large ? 3 : 4.5
      if (cr < need) out.lowContrast.push(`${cr.toFixed(2)}<${need} ${cs.fontSize}/${cs.fontWeight} "${text}" ${label(el)}`)
    }

    const lh = parseFloat(cs.lineHeight) || px * 1.4
    const cell = el.closest("td, th")
    if (cell && !el.querySelector("*")) {
      const rng = document.createRange()
      rng.selectNodeContents(el)
      let lines = Math.max(1, Math.round(rng.getBoundingClientRect().height / lh))
      if (/hidden|clip/.test(cs.overflow) || cs.webkitLineClamp !== "none") {
        lines = Math.min(lines, Math.max(1, Math.round(el.clientHeight / lh)))
      }
      if (lines >= 3 && text.length > 6) out.wrap3.push(`${lines} lines "${text}" ${label(el)}`)
      if (el.tagName === "TH" || cell.tagName === "TH") {
        if (fg && bg !== null && ratio(lumOf(fg), bg) < 4.5) out.headerWeak.push(`"${text}"`)
      }
    }

    // Visually-hidden text clips on purpose: that is how a screen-reader-only
    // caption is kept out of the layout. Flagging it would push authors to
    // delete accessible labels to get the suite green.
    const screenReaderOnly =
      el.clientWidth <= 1 || el.clientHeight <= 1 || cs.clip === "rect(0px, 0px, 0px, 0px)"

    if (
      !screenReaderOnly &&
      el.scrollWidth > el.clientWidth + 2 &&
      !/auto|scroll|visible/.test(cs.overflowX) &&
      cs.textOverflow !== "ellipsis"
    ) {
      out.clipped.push(`"${text}" ${label(el)}`)
    }
  }

  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].slice(0, 6)
  return out
}

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1280", width: 1280, height: 860 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
]

for (const theme of ["light", "dark"]) {
  for (const vp of VIEWPORTS) {
    test.describe(`${theme} @ ${vp.name}px`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } })

      for (const mod of MODULES) {
        test(`${mod.path} typography and colour`, async ({ page, context, request }) => {
          await seed(context, { token: await getAdminToken(request), theme })
          await gotoModule(page, mod.path)

          const a = await page.evaluate(AUDIT, [TEXT_SIZES, ICON_SIZES, WEIGHTS])

          expect(a.badSize, "font size outside the approved scale").toEqual([])
          expect(a.badWeight, "font weight outside 400/500/600").toEqual([])
          expect(a.badFamily, "a font family other than Inter or the mono stack").toEqual([])
          expect(a.tiny, "text rendered below 11px").toEqual([])
          expect(a.lowContrast, "text below its WCAG AA threshold").toEqual([])
          expect(a.headerWeak, "table header below 4.5:1").toEqual([])
          expect(a.wrap3, "cell text wrapping to three or more lines").toEqual([])
          expect(a.clipped, "text clipped without an ellipsis").toEqual([])
        })
      }
    })
  }
}

test("the type scale resolves from one place", async ({ page, context, request }) => {
  await seed(context, { token: await getAdminToken(request) })
  await gotoModule(page, "overview")

  // Every text colour in use must come from a --text-* custom property.
  const vars = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    const names = ["primary", "secondary", "muted", "faint", "disabled", "accent", "success", "warning", "danger", "info"]
    return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(`--text-${n}`).trim()]))
  })
  for (const [name, value] of Object.entries(vars)) {
    expect(value, `--text-${name} is not defined`).toMatch(/^\d+ \d+ \d+$/)
  }

  const distinct = await page.evaluate(() => {
    const seen = new Set()
    for (const el of document.querySelectorAll("main *")) {
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (hasText) seen.add(getComputedStyle(el).fontSize)
    }
    return [...seen].sort()
  })
  // A page draws on a handful of steps, not a dozen ad-hoc sizes.
  expect(distinct.length, `page uses ${distinct.length} sizes: ${distinct.join(", ")}`).toBeLessThanOrEqual(7)
})
