import { expect, test } from "@playwright/test"
import { axe, open, signIn, toast } from "./support.js"

/*
 * Notifications against the real API (seed/30-notifications.ts): the log
 * with its filters and message detail, sending a dead letter again,
 * provider templates saved and cleared, a failed outbox event retried, and
 * what a non-owner can and can't do.
 */

test.describe.configure({ mode: "serial" })

const pick = async (page, control, option) => {
  await page.getByRole("button", { name: control, exact: true }).click()
  await page.getByRole("option", { name: option, exact: true }).click()
}

test("the log: filter by outcome, channel and recipient; a message's detail", async ({ page, context }) => {
  await signIn(context)
  await open(page, "notifications")
  await expect(page.locator("main h1").first()).toHaveText("Notifications")
  const table = page.getByRole("table", { name: "Notification messages" })
  // order_confirmed and order_shipped, each by email and SMS.
  await expect(table.getByRole("row")).toHaveCount(5)
  await axe(page)

  await pick(page, "Outcome", "Skipped")
  await expect(table.getByRole("row")).toHaveCount(3)
  await expect(table.getByText("Order confirmed")).toHaveCount(2)
  await pick(page, "Outcome", "All outcomes")

  await pick(page, "Channel", "SMS")
  await page.getByLabel("Search recipients").fill("9886011111")
  await expect(table.getByRole("row")).toHaveCount(3)
  await page.getByLabel("Search recipients").fill("nobody@example.com")
  await expect(page.getByText("No messages match")).toBeVisible()
  await page.getByRole("button", { name: "Clear filters" }).click()

  await pick(page, "Event", "Order confirmed")
  await table.getByRole("row").nth(1).click()
  const detail = page.getByLabel("Message details")
  await expect(detail.getByText(/Skipped: No (email|SMS) provider configured/)).toBeVisible()
  await expect(detail.getByText(/^Template variables: 1\. Meera · 2\. #\d+ · 3\. Rs 2,490\.00$/)).toBeVisible()
})

test("a dead letter is sent again", async ({ page, context }) => {
  await signIn(context)
  await open(page, "notifications")
  await pick(page, "Outcome", "Dead letter")
  const table = page.getByRole("table", { name: "Notification messages" })
  await expect(table.getByRole("row")).toHaveCount(2)
  await table.getByText("meera@example.com").click()
  const detail = page.getByLabel("Message details")
  await expect(detail.getByText("Last error: SMTP 421 4.7.0 Try again later, closing connection")).toBeVisible()
  await expect(detail.getByText("SMTP", { exact: true })).toBeVisible()
  await detail.getByRole("button", { name: "Send again" }).click()
  await expect(toast(page, "Queued to send again")).toBeVisible()
  await expect(page.getByText("No messages match")).toBeVisible()
  await pick(page, "Outcome", "Queued")
  await expect(table.getByText("meera@example.com")).toBeVisible()
})

test("provider templates: variables in order, saved, kept, cleared", async ({ page, context }) => {
  await signIn(context)
  await open(page, "notifications")
  await page.getByRole("tab", { name: "Templates" }).click()
  const form = page.getByRole("form", { name: "Templates for Order shipped" })
  await expect(form.getByText("order number", { exact: false }).first()).toBeVisible()
  await expect(form.locator("li")).toHaveText([/\{\{1\}\} order number/, /\{\{2\}\} courier/, /\{\{3\}\} AWB/])
  await form.getByLabel("MSG91 flow id").fill("65f1c2a9d6fc0533a12b4c71")
  await form.getByLabel("WhatsApp template name (Meta)").fill("order_shipped_v2")
  await form.getByLabel("Language").fill("en_US")
  await form.getByRole("button", { name: "Save" }).click()
  await expect(toast(page, "Templates saved for Order shipped")).toBeVisible()
  await axe(page)

  await page.reload()
  await page.getByRole("tab", { name: "Templates" }).click()
  const again = page.getByRole("form", { name: "Templates for Order shipped" })
  await expect(again.getByLabel("MSG91 flow id")).toHaveValue("65f1c2a9d6fc0533a12b4c71")
  await expect(again.getByLabel("WhatsApp template name (Meta)")).toHaveValue("order_shipped_v2")
  await expect(again.getByLabel("Language")).toHaveValue("en_US")
  await again.getByRole("button", { name: "Clear" }).click()
  await expect(toast(page, "Templates cleared for Order shipped")).toBeVisible()
  await expect(again.getByLabel("MSG91 flow id")).toHaveValue("")
})

test("channels show what can send; a failed outbox event is retried", async ({ page, context }) => {
  await signIn(context)
  await open(page, "notifications")
  await page.getByRole("tab", { name: "Channels" }).click()
  await expect(page.getByText("Not configured")).toHaveCount(4)
  await expect(page.getByRole("table", { name: "Channels used by each notification event" }).getByRole("row")).toHaveCount(15)
  await axe(page)

  await page.getByRole("tab", { name: /Outbox/ }).click()
  await expect(page.getByText("connection reset while loading the order")).toBeVisible()
  await page.getByRole("button", { name: "Retry order.placed event" }).click()
  await expect(toast(page, "Event queued again")).toBeVisible()
  await expect(page.getByText("Nothing failed")).toBeVisible()
  await axe(page)
})

test("staff see the same records but can't retry or change templates", async ({ page, context }) => {
  await signIn(context, "staff")
  await open(page, "notifications")
  await expect(page.getByRole("note")).toHaveText("Only an owner can retry messages or change templates.")
  await page.getByRole("table", { name: "Notification messages" }).getByRole("row").nth(1).click()
  await expect(page.getByRole("button", { name: "Send again" })).toHaveCount(0)
  await page.getByRole("tab", { name: "Templates" }).click()
  const form = page.getByRole("form", { name: "Templates for Order shipped" })
  await expect(form.getByLabel("MSG91 flow id")).toBeDisabled()
  await expect(form.getByRole("button", { name: "Save" })).toHaveCount(0)
})
