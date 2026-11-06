/*
 * Storefront performance audit: the same scenarios before and after a change,
 * in Chrome (Playwright) driven over the DevTools protocol, against a
 * production build. Run from apps/storefront:
 *
 *   node scripts/perf-audit.mjs http://localhost:8012 > before.json
 *
 * Each scenario runs on a fresh profile with the CPU slowed 4x (a mid-range
 * Android phone), and reports:
 *   - Web Vitals from the browser's own observers: LCP, CLS, and total
 *     blocking time (long tasks over 50 ms after first paint);
 *   - JavaScript and total bytes transferred, and request counts;
 *   - React work: commits, and components rendered (fibers that performed
 *     work), read through the same hook React DevTools uses;
 *   - interaction latency: the longest Event Timing entry (what INP reports)
 *     and the wall time until the result is on screen.
 * Nothing here talks to anything but the URL given.
 */
import { chromium } from "@playwright/test"

const BASE = process.argv[2] ?? "http://localhost:8012"
const RUNS = Number(process.argv[3] ?? 3)
const CPU = 4

/**
 * Counts React commits and the components each one rendered, the way React
 * DevTools decides it: a component rendered in a commit if it is new, or its
 * props or state object changed since the previous commit. (The PerformedWork
 * flag alone overcounts: a subtree React skips keeps its old flags.)
 */
const REACT_HOOK = () => {
  const stats = { commits: 0, rendered: 0, byName: {} }
  window.__perf = stats
  const seen = new WeakMap()
  const countWork = (root) => {
    let n = 0
    const stack = [root]
    while (stack.length) {
      const f = stack.pop()
      if (!f) continue
      if (typeof f.type === "function") {
        const prev = seen.get(f) ?? (f.alternate && seen.get(f.alternate))
        const rendered = !prev || prev.props !== f.memoizedProps || prev.state !== f.memoizedState
        const rec = { props: f.memoizedProps, state: f.memoizedState }
        seen.set(f, rec)
        if (f.alternate) seen.set(f.alternate, rec)
        if (rendered) {
          n++
          const name = f.type.displayName || f.type.name || "anonymous"
          stats.byName[name] = (stats.byName[name] ?? 0) + 1
        }
      }
      if (f.child) stack.push(f.child)
      if (f.sibling) stack.push(f.sibling)
    }
    return n
  }
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers: new Map(),
    inject() {
      return 1
    },
    onCommitFiberRoot(_id, root) {
      stats.commits++
      stats.rendered += countWork(root.current)
    },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    checkDCE() {},
  }
}

/** Web Vitals and interaction timing from the page's own observers. */
const VITALS = () => {
  const v = { lcp: 0, cls: 0, tbt: 0, fcp: 0, inp: 0, events: [] }
  window.__vitals = v
  new PerformanceObserver((l) => l.getEntries().forEach((e) => (v.lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true })
  new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (v.cls += e.value))).observe({ type: "layout-shift", buffered: true })
  new PerformanceObserver((l) =>
    l.getEntries().forEach((e) => {
      if (e.name === "first-contentful-paint") v.fcp = e.startTime
    })
  ).observe({ type: "paint", buffered: true })
  new PerformanceObserver((l) => l.getEntries().forEach((e) => v.fcp && e.startTime > v.fcp && (v.tbt += Math.max(0, e.duration - 50)))).observe({ type: "longtask", buffered: true })
  new PerformanceObserver((l) =>
    l.getEntries().forEach((e) => {
      if (e.interactionId) v.inp = Math.max(v.inp, e.duration)
    })
  ).observe({ type: "event", buffered: true, durationThreshold: 16 })
}

async function fresh(browser, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport })
  await context.addInitScript(REACT_HOOK)
  await context.addInitScript(VITALS)
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send("Network.enable")
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: false })
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU })
  const net = { js: 0, total: 0, requests: 0, rsc: 0, jsFiles: new Set() }
  const types = new Map()
  cdp.on("Network.responseReceived", (e) => {
    types.set(e.requestId, { type: e.type, url: e.response.url })
    if (e.response.url.includes("_rsc=") || e.response.headers["content-type"]?.includes("text/x-component")) net.rsc++
  })
  cdp.on("Network.loadingFinished", (e) => {
    const t = types.get(e.requestId)
    net.requests++
    net.total += e.encodedDataLength
    if (t?.type === "Script") {
      net.js += e.encodedDataLength
      net.jsFiles.add(t.url.split("?")[0])
    }
  })
  return { context, page, net }
}

const reset = (page) => page.evaluate(() => Object.assign(window.__perf, { commits: 0, rendered: 0, byName: {} }))
const react = (page) =>
  page.evaluate(() => ({
    commits: window.__perf.commits,
    rendered: window.__perf.rendered,
    // The components that rendered most: where the work went.
    top: Object.entries(window.__perf.byName).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join(" "),
  }))
const vitals = (page) => page.evaluate(() => ({ ...window.__vitals, events: undefined }))
const kb = (n) => Math.round(n / 102.4) / 10

const scenarios = {
  /** First load of the home page. */
  async home(browser) {
    const { context, page, net } = await fresh(browser)
    const t0 = Date.now()
    await page.goto(`${BASE}/in`, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")
    const v = await vitals(page)
    const r = await react(page)
    await context.close()
    return { loadMs: Date.now() - t0, lcp: v.lcp, cls: v.cls, tbt: v.tbt, jsKB: kb(net.js), totalKB: kb(net.total), requests: net.requests, jsFiles: net.jsFiles.size, commits: r.commits, rendered: r.rendered }
  },

  /** First load of the full listing (12 cards). */
  async listing(browser) {
    const { context, page, net } = await fresh(browser)
    const t0 = Date.now()
    await page.goto(`${BASE}/in/store`, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")
    const v = await vitals(page)
    const r = await react(page)
    await context.close()
    return { loadMs: Date.now() - t0, lcp: v.lcp, cls: v.cls, tbt: v.tbt, jsKB: kb(net.js), totalKB: kb(net.total), requests: net.requests, jsFiles: net.jsFiles.size, commits: r.commits, rendered: r.rendered }
  },

  /** Hovering one card for 4 s (autoplay runs), then leaving it. */
  async cardHover(browser) {
    const { context, page } = await fresh(browser)
    await page.goto(`${BASE}/in/store`, { waitUntil: "networkidle" })
    const card = page.getByTestId("product-wrapper").nth(1)
    await card.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await reset(page)
    await card.hover()
    await page.waitForTimeout(4000)
    await page.mouse.move(5, 5)
    await page.waitForTimeout(600)
    const r = await react(page)
    const v = await vitals(page)
    await context.close()
    return { commits: r.commits, rendered: r.rendered, renderedPerCommit: r.commits ? Math.round((r.rendered / r.commits) * 10) / 10 : 0, inp: v.inp, top: r.top }
  },

  /** Picking a sort option: click to the new grid on screen. */
  async sort(browser) {
    const { context, page, net } = await fresh(browser)
    await page.goto(`${BASE}/in/store`, { waitUntil: "networkidle" })
    await reset(page)
    const before = net.requests
    const rsc = net.rsc
    const t0 = Date.now()
    await page.getByRole("link", { name: /Price, low to high/i }).first().click()
    await page.waitForURL(/sort=/)
    await page.waitForLoadState("networkidle")
    const ms = Date.now() - t0
    const r = await react(page)
    const v = await vitals(page)
    await context.close()
    return { ms, inp: v.inp, requests: net.requests - before, rsc: net.rsc - rsc, commits: r.commits, rendered: r.rendered, top: r.top }
  },

  /** Ticking a filter in the sidebar. */
  async filter(browser) {
    const { context, page, net } = await fresh(browser)
    await page.goto(`${BASE}/in/store`, { waitUntil: "networkidle" })
    await reset(page)
    const before = net.requests
    const rsc = net.rsc
    const t0 = Date.now()
    const option = page.locator("aside").getByRole("link").filter({ hasText: /^Men/ }).first()
    await option.click()
    await page.waitForURL(/(categories|gender|men)/i)
    await page.waitForLoadState("networkidle")
    const ms = Date.now() - t0
    const r = await react(page)
    const v = await vitals(page)
    await context.close()
    return { ms, inp: v.inp, requests: net.requests - before, rsc: net.rsc - rsc, commits: r.commits, rendered: r.rendered, top: r.top }
  },

  /** Listing to product page by clicking a card, then Back. */
  async productNav(browser) {
    const { context, page, net } = await fresh(browser)
    await page.goto(`${BASE}/in/store`, { waitUntil: "networkidle" })
    await page.waitForTimeout(800)
    const before = net.requests
    const t0 = Date.now()
    // The card image is the link a pointer reaches (the hover panel covers the title).
    await page.getByTestId("product-card-gallery").first().click()
    await page.waitForURL(/\/products\//)
    await page.getByTestId("add-product-button").waitFor()
    const toProduct = Date.now() - t0
    const t1 = Date.now()
    await page.goBack()
    await page.getByTestId("product-wrapper").first().waitFor()
    const back = Date.now() - t1
    const v = await vitals(page)
    await context.close()
    return { toProductMs: toProduct, backMs: back, inp: v.inp, requests: net.requests - before }
  },

  /** Opening search and typing a query. */
  async search(browser) {
    const { context, page, net } = await fresh(browser)
    await page.goto(`${BASE}/in`, { waitUntil: "networkidle" })
    await reset(page)
    const before = net.requests
    // The header's search bar is a button that opens the search dialog.
    await page.getByRole("button", { name: "Search products" }).first().click()
    const field = page.getByPlaceholder(/Search/i).first()
    await field.waitFor()
    await page.keyboard.type("linen shirt", { delay: 90 })
    await page.waitForTimeout(1500)
    const r = await react(page)
    const v = await vitals(page)
    await context.close()
    return { inp: v.inp, requests: net.requests - before, commits: r.commits, rendered: r.rendered, top: r.top }
  },
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

const browser = await chromium.launch({ channel: "chrome" })
const out = {}
for (const [name, run] of Object.entries(scenarios)) {
  const results = []
  for (let i = 0; i < RUNS; i++) {
    try {
      results.push(await run(browser))
    } catch (e) {
      results.push({ error: e.message.split("\n")[0] })
    }
  }
  const ok = results.filter((r) => !r.error)
  out[name] = ok.length
    ? Object.fromEntries(Object.keys(ok[0]).map((k) => [k, typeof ok[0][k] === "number" ? Math.round(median(ok.map((r) => r[k])) * 100) / 100 : ok[0][k]]))
    : { error: results[0]?.error }
  console.error(name, JSON.stringify(out[name]))
}
await browser.close()
console.log(JSON.stringify({ base: BASE, cpuSlowdown: CPU, runs: RUNS, at: new Date().toISOString(), scenarios: out }, null, 2))
