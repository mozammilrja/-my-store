import { test } from "@playwright/test"
import { getAdminToken, seed, gotoModule, MODULES } from "./helpers.js"

test("find wrapped date cells", async ({ page, context, request }) => {
  await page.setViewportSize({ width: 1680, height: 950 })
  await seed(context, { token: await getAdminToken(request) })
  for (const mod of MODULES) {
    await gotoModule(page, mod.path)
    await page.waitForTimeout(900)
    const hits = await page.evaluate(() => {
      const DATE = /\d{1,2}\s+\w{3,}\s+\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/
      const out = []
      for (const td of document.querySelectorAll("tbody td")) {
        for (const el of td.querySelectorAll("span,div,p")) {
          if (el.children.length) continue
          const txt = (el.textContent || "").trim()
          if (!DATE.test(txt)) continue
          const cs = getComputedStyle(el)
          const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4
          const lines = Math.round(el.getBoundingClientRect().height / lh)
          if (lines > 1) out.push(`${lines} lines: "${txt.slice(0, 48)}"`)
        }
      }
      return [...new Set(out)]
    })
    if (hits.length) console.log(`\n### ${mod.path}\n  ` + hits.slice(0, 6).join("\n  "))
  }
})
