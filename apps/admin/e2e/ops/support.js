import fs from "node:fs"
import AxeBuilder from "@axe-core/playwright"
import { expect } from "@playwright/test"

/*
 * Shared steps for the operations specs (*.ops.js): signing in as a role
 * with the token the API server wrote, waiting for a module to load, toasts,
 * and an axe accessibility check.
 */

const SLOT = process.env.OPS_SLOT ?? ""
const STATE = new URL(`./.state${SLOT ? `.${SLOT}` : ""}.json`, import.meta.url)

/** Opens the admin as `who` (owner | finance | staff). */
export async function signIn(context, who = "owner") {
  const { tokens } = JSON.parse(fs.readFileSync(STATE, "utf8"))
  await context.addInitScript(
    ([token]) => {
      localStorage.setItem("everwear_admin_token", token)
      localStorage.setItem("everwear_admin_theme", "light")
    },
    [tokens[who]]
  )
}

/** Goes to a module and waits for its skeleton to give way to content. */
export async function open(page, path) {
  await page.goto(`/${path}`, { waitUntil: "load" })
  await page.waitForFunction(() => !document.querySelector('main [role="status"][aria-busy="true"]'), undefined, { timeout: 30_000 })
  await expect(page.locator("main h1").first()).toBeVisible()
}

/** A toast with this text. */
export const toast = (page, text) => page.getByRole("status").or(page.getByRole("alert")).filter({ hasText: text }).first()

export async function axe(page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([])
}
