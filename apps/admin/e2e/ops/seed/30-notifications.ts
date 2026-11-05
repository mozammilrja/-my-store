import type { SeedContext } from "../api-server.ts"

/*
 * Notification records for the Notifications screen. Messages are queued by
 * the real notifyCustomer and sent by the real worker: with no provider
 * configured they end "skipped" with the true reason. A message that died
 * after retries and one that was sent can't happen without a provider, so
 * those two outcomes are written onto real queued messages as fixtures.
 * The outbox dead letter is a placed-order event that kept failing.
 */
export async function seed({ db, now, api }: SeedContext) {
  const { notifyCustomer, deliverDue } = await import("../../../../backend/src/lib/notify/index.ts")
  // A real cash-on-delivery order, placed through the store API.
  await db.products().insertOne({
    _id: "prod_ntf_scarf",
    handle: "silk-scarf-ntf",
    title: "Silk Scarf",
    status: "published",
    images: [],
    categoryIds: [],
    collectionId: null,
    tags: [],
    options: [{ title: "Size", values: ["Free"] }],
    variants: [{ _id: "var_ntf_scarf", sku: "EW-SCARF-NTF", title: "Free", options: { Size: "Free" }, prices: { inr: 249000 }, manageInventory: false, allowBackorder: false, stock: 0 }],
    createdAt: now,
    updatedAt: now,
  } as never)
  const store = { "x-test": "seed" }
  const address = { firstName: "Meera", lastName: "Iyer", address1: "4 Residency Road", city: "Bengaluru", postalCode: "560025", province: "Karnataka", countryCode: "in", phone: "+91 9886011111" }
  const cart = (await api("POST", "/store/carts", { country: "in" }, store)).cart
  await api("POST", `/store/carts/${cart.id}/items`, { variantId: "var_ntf_scarf", quantity: 1 }, store)
  await api("PATCH", `/store/carts/${cart.id}`, { email: "meera@example.com", shippingAddress: address, billingAddress: address }, store)
  await api("POST", `/store/carts/${cart.id}/shipping`, { optionId: "so_std" }, store)
  const placed = (await api("POST", `/store/carts/${cart.id}/complete`, undefined, store)).order
  const order = (await db.orders().findOne({ _id: placed.id }))!

  // Queued then worked: no providers here, so each is skipped with its reason.
  await notifyCustomer(order, "order_confirmed", `${order._id}:confirmed:seed`)
  await deliverDue(50)

  await notifyCustomer(order, "order_shipped", `${order._id}:shipped:seed`, { carrier: "Delhivery Surface", awb: "1234500001001" })
  const shipped = await db.notificationDeliveries().find({ key: { $regex: `^${order._id}:shipped:seed` } }).toArray()
  const email = shipped.find((d) => d.channel === "email")!
  const sms = shipped.find((d) => d.channel === "sms")!
  await db.notificationDeliveries().updateOne({ _id: email._id }, { $set: { status: "dead", attempts: 5, lastError: "SMTP 421 4.7.0 Try again later, closing connection", provider: "smtp", updatedAt: now } })
  await db.notificationDeliveries().updateOne({ _id: sms._id }, { $set: { status: "sent", attempts: 1, provider: "msg91", providerMessageId: "3a6b2f9c11d04e", sentAt: now, updatedAt: now } })

  // The placed-order event the outbox worker kept failing on.
  await db.outboxEvents().insertOne({
    _id: "obx_ntf_1",
    topic: "order.placed",
    payload: { orderId: order._id },
    status: "failed",
    retryCount: 5,
    lastError: "connection reset while loading the order",
    createdAt: now,
  } as never)
}
