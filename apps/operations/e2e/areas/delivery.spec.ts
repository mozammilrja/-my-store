import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"
import { readFile } from "node:fs/promises"

/*
 * A rider's day on a phone, against the real API: go online and get both
 * parcels offered, accept them, collect them at the hub by AWB, go out for
 * delivery (location shared), deliver the first with the customer's OTP and
 * cash, fail the second with a reason, hand the cash in, check earnings.
 * Then a new rider signs up and is held as pending.
 */

test.describe.configure({ mode: "serial" })

type State = { api: string; customerToken: string; orders: { id: string; displayId: number; awb: string; total: number }[] }
const state = async (): Promise<State> => JSON.parse(await readFile(new URL("./.state.delivery.json", import.meta.url), "utf8"))

/** What the customer's order page shows: OTP, rider, position. */
async function customerView(orderId: string) {
  const s = await state()
  const res = await fetch(`${s.api}/store/orders/${orderId}`, { headers: { authorization: `Bearer ${s.customerToken}` } })
  return ((await res.json()) as { order: { delivery: { otp: string | null; rider: { firstName: string } | null; location: { lat: number; lng: number } | null } } }).order.delivery
}

const toast = (page: Page, text: string | RegExp) => page.locator("[aria-live] [role=status], [aria-live] [role=alert]").filter({ hasText: text })
const rupees = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100)

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([])
}

async function signIn(page: Page) {
  // The portal's one sign-in; riders land in /delivery.
  await page.goto("/login")
  await page.getByLabel("Email").fill("ravi@everwear.test")
  await page.getByLabel("Password", { exact: true }).fill("rider-password-1")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("switch")).toBeVisible()
}

test("going online brings the waiting parcels as offers; accepted ones show the address", async ({ page }) => {
  await signIn(page)
  await expect(page.getByText("You're offline.")).toBeVisible()
  await axe(page)
  await page.getByRole("switch", { name: /Go online/ }).click()
  await expect(page.getByRole("switch", { name: /Online/ })).toHaveAttribute("aria-checked", "true")
  const offers = page.getByRole("region", { name: "New offers" }).getByRole("article")
  await expect(offers).toHaveCount(2)
  await expect(offers.first()).toContainText("Bengaluru 560038")
  await expect(offers.first()).toContainText(/Collect ₹/)
  await expect(page.getByText("12 CMH Road")).toHaveCount(0)
  await axe(page)
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Accept" }).first().click()
    await expect(toast(page, "Accepted")).toBeVisible()
  }
  await expect(offers).toHaveCount(0)
  await expect(page.getByText("12 CMH Road, Indiranagar")).toBeVisible()
  await expect(page.getByRole("heading", { name: /Collect from the hub \(2\)/ })).toBeVisible()
})

test("parcels are collected at the hub by AWB; a wrong AWB is refused", async ({ page }) => {
  const { orders } = await state()
  await signIn(page)
  const scan = page.getByLabel("Scan the parcel's AWB")
  await scan.fill("EWF000000000")
  await scan.press("Enter")
  await expect(toast(page, "isn't one of your deliveries")).toBeVisible()
  for (const o of orders) {
    await scan.fill(o.awb.toLowerCase())
    await scan.press("Enter")
    await expect(toast(page, `${o.awb} collected`)).toBeVisible()
  }
  await page.getByRole("button", { name: "Start delivering 2 parcels" }).click()
  await expect(toast(page, "Out for delivery")).toBeVisible()
  // Location is shared only now, and the customer can see it.
  await expect(page.getByText("Sharing your location with your customers")).toBeVisible()
  await expect.poll(async () => (await customerView(orders[0]!.id)).location?.lat, { timeout: 15_000 }).toBeCloseTo(12.9719, 3)
  const view = await customerView(orders[0]!.id)
  expect(view.otp).toMatch(/^\d{6}$/)
  expect(view.rider?.firstName).toBe("Ravi")
})

test("delivering: wrong OTP refused, then the customer's OTP and the cash, sent through a dropped connection", async ({ page, context }) => {
  const { orders } = await state()
  const first = orders[0]!
  await signIn(page)
  await page.getByRole("link", { name: /12 CMH Road/ }).click()
  await expect(page.getByRole("link", { name: "Call customer" })).toHaveAttribute("href", "tel:+919886012345")
  await expect(page.getByRole("link", { name: "Navigate" })).toHaveAttribute("href", /google\.com\/maps\/dir/)
  await expect(page.getByText(`Collect ${rupees(first.total)} in cash on delivery.`)).toBeVisible()
  await axe(page)
  const { otp } = await customerView(first.id)
  await page.getByLabel("Delivery OTP from the customer").fill(otp === "000000" ? "111111" : "000000")
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Confirm delivery" }).click()
  await expect(toast(page, "doesn't match")).toBeVisible()
  await page.getByLabel("Delivery OTP from the customer").fill(otp!)
  // The signal drops at the door: the confirmation waits instead of failing.
  await context.setOffline(true)
  await expect(page.getByRole("status").filter({ hasText: "What you do now is kept" })).toBeVisible()
  await page.getByRole("button", { name: "Confirm delivery" }).click()
  await expect(page.getByText("No connection. The delivery will be sent as soon as you're back online")).toBeVisible()
  await expect(page.getByRole("button", { name: "Waiting for network" })).toBeVisible()
  expect((await customerView(first.id)).otp, "nothing reached the server yet").toBe(otp)
  // Back online: it goes by itself, once.
  await context.setOffline(false)
  await expect(toast(page, `${first.awb} delivered`)).toBeVisible()
  await expect(page.getByRole("status").filter({ hasText: "Back online" })).toBeVisible()
  expect((await customerView(first.id)).otp).toBeNull()
})

test("a failed attempt is recorded with its reason", async ({ page }) => {
  await signIn(page)
  await page.getByRole("link", { name: /7 Old Madras Road/ }).click()
  await page.getByRole("button", { name: "Couldn't deliver" }).click()
  await page.getByLabel("Reason").selectOption("customer_unavailable")
  await page.getByLabel("Note (optional)").fill("No answer at the gate, called twice")
  await page.getByRole("button", { name: "Record attempt" }).click()
  await expect(toast(page, "Attempt recorded")).toBeVisible()
  await expect(page.getByText("Customer not available · No answer at the gate")).toBeVisible()
  await expect(page.getByRole("button", { name: "Try delivering again" })).toBeVisible()
})

test("cash is handed over, and earnings show the day", async ({ page }) => {
  const { orders } = await state()
  await signIn(page)
  await page.getByRole("link", { name: "Cash" }).click()
  await expect(page.getByText(rupees(orders[0]!.total)).first()).toBeVisible()
  await page.getByRole("button", { name: "Hand over to the hub" }).click()
  await page.getByLabel("Amount handed over (₹)").fill(String(orders[0]!.total / 100))
  await page.getByRole("button", { name: "Record handover" }).click()
  await expect(toast(page, "Handover recorded")).toBeVisible()
  await expect(page.getByText("Waiting for count")).toBeVisible()
  await axe(page)
  await page.getByRole("link", { name: "Earnings" }).click()
  await expect(page.getByRole("definition").first()).toHaveText("1")
  await expect(page.getByRole("definition").nth(1)).toHaveText("1")
  await expect(page.getByText(rupees(4000 + 1500))).toBeVisible()
  await page.screenshot({ path: "test-results/areas/rider-earnings.png" })
  await axe(page)
})

/*
 * Automated Chrome can't register with a push service, so it refuses the
 * subscription. What this checks is that the app reports the browser's
 * answer and never claims notifications are on when they aren't. Delivery
 * itself (encryption, VAPID, the push service call) is tested in the
 * backend suite, which decrypts the payload as a browser would.
 */
test("turning on notifications asks the browser and reports its answer truthfully", async ({ page }) => {
  await signIn(page)
  await page.getByRole("link", { name: "Profile" }).click()
  await expect(page.getByText(/New offers and changes to your route\. Off on this device\./)).toBeVisible()
  await page.getByRole("button", { name: "Turn on notifications" }).click()
  const on = page.getByText(/On for this device\./)
  const refused = toast(page, /Registration failed|push service/i)
  await expect(on.or(refused)).toBeVisible({ timeout: 20_000 })
  if (await refused.isVisible()) {
    // Still off, and the button still offers to turn it on: no false "on".
    await expect(page.getByText(/Off on this device\./)).toBeVisible()
    await expect(page.getByRole("button", { name: "Turn on notifications" })).toBeVisible()
  } else {
    await expect(page.getByRole("button", { name: "Turn off" })).toBeVisible()
  }
})

test("a new rider signs up and waits for approval", async ({ page }) => {
  await page.goto("/delivery/register")
  await page.getByLabel("Full name").fill("Sunita Devi")
  await page.getByLabel("Mobile number").fill("98450 77777")
  await page.getByLabel("Email").fill("sunita@everwear.test")
  await page.getByLabel("Password").fill("a-long-password")
  await page.getByLabel("Registration").fill("KA 05 MN 4321")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByText("Your account is waiting for approval.")).toBeVisible()
  await expect(page.getByRole("switch")).toHaveCount(0)
  await page.getByRole("link", { name: "Profile" }).click()
  await page.getByLabel("Number").fill("KA0520210009999")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByText(/••••9999/)).toBeVisible()
  await page.screenshot({ path: "test-results/areas/rider-profile.png", fullPage: true })
  await axe(page)
})
