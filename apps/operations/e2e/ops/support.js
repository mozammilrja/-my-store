import fs from "node:fs"
import AxeBuilder from "@axe-core/playwright"
import { expect } from "@playwright/test"

/*
 * Shared steps for the operations specs (*.ops.js): signing in as a role
 * through the portal's sign-in API (the session cookie lands in the browser
 * context), waiting for a module to load, toasts, and an axe check.
 */

const SLOT = process.env.OPS_SLOT ?? ""
const STATE = new URL(`./.state${SLOT ? `.${SLOT}` : ""}.json`, import.meta.url)

/** Signs the browser context in as `who` (owner | finance | staff). */
export async function signIn(context, who = "owner") {
  const { api, users, password } = JSON.parse(fs.readFileSync(STATE, "utf8"))
  const res = await context.request.post(`${api}/ops/auth/login`, { data: { email: users[who], password } })
  expect(res.ok(), `sign-in as ${who}: ${res.status()}`).toBeTruthy()
  expect((await context.cookies(api)).some((c) => c.name === "everwear_ops"), "session cookie set").toBeTruthy()
  await context.addInitScript(() => localStorage.setItem("everwear_admin_theme", "light"))
}

/** Goes to a module and waits for its skeleton to give way to content. */
export async function open(page, path) {
  await page.goto(`/admin/${path}`, { waitUntil: "load" })
  await page.waitForFunction(() => !document.querySelector('main [role="status"][aria-busy="true"]'), undefined, { timeout: 30_000 })
  await expect(page.locator("main h1").first()).toBeVisible()
}

/** A toast with this text. */
export const toast = (page, text) => page.getByRole("status").or(page.getByRole("alert")).filter({ hasText: text }).first()

export async function axe(page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([])
}
