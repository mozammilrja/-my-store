import { getProduct, getRegion, getStorePolicies, listCategories } from "@lib/data/catalog"
import { getPaymentMethods } from "@lib/data/payments"
import { retrieveCart } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { getSeller } from "@lib/data/seller"
import { RecoveryMethods, type RecoveryMethod } from "@modules/checkout/recovery-methods"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { CheckoutFooter, CheckoutHeader, MIcon, StitchPage } from "@modules/stitch/shell"
import { Metadata } from "next"
import Image from "next/image"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Payment Authorization Unsuccessful | Everwear",
  robots: { index: false },
}

const METHOD_LABEL: Record<string, string> = {
  upi: "UPI",
  card: "card",
  emi: "EMI",
  netbanking: "NetBanking",
}

/**
 * Stitch: storefront_checkout_payment_declined_recovery_hub.
 *
 * Reached from the payment step when an online payment does not go through:
 * /checkout/payment-failed?method=<upi|card|netbanking>&reason=<API message>.
 * Every value is real: the provider's message, the bag's lines and totals, the
 * region's tax and return policy, and which payment methods the API offers.
 * Without a bag there is nothing to recover, so the visitor goes to /cart.
 */
export default async function PaymentFailed(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ reason?: string; method?: string }>
}) {
  const seller = await getSeller()
  const [{ countryCode }, { reason, method }] = await Promise.all([props.params, props.searchParams])
  const [cart, payments, region, policies] = await Promise.all([
    retrieveCart().catch(() => null),
    getPaymentMethods(),
    getRegion(countryCode).catch(() => null),
    getStorePolicies(countryCode).catch(() => null),
  ])

  if (!cart || cart.completed || cart.items.length === 0) redirect(`/${countryCode}/cart`)

  // Eyebrow ("Garment • Unisex" in the design) and option labels come from the real product.
  const [products, categories] = await Promise.all([
    Promise.all(cart.items.map((i) => getProduct(i.productHandle, countryCode).catch(() => null))),
    listCategories().catch(() => []),
  ])
  const details = cart.items.map((item, i) => {
    const product = products[i]
    const category = categories.find((c) => product?.categoryIds.includes(c.id))?.name
    const eyebrow = [category, product?.brand].filter(Boolean).join(" • ")
    const parts = item.variantTitle ? item.variantTitle.split(" / ") : []
    const first = product?.options[0]?.title
    const variant = parts.map((v, n) => (n === 0 && first ? `${first}: ${v}` : v)).join(" • ")
    return { eyebrow, variant }
  })

  const money = (n: number) => formatMoney(n, cart.currency)
  const { totals, items } = cart
  const count = items.reduce((n, i) => n + i.quantity, 0)
  const failed: RecoveryMethod | null =
    method === "upi" || method === "card" || method === "netbanking" ? method : method === "emi" ? "card" : null
  const failedLabel = method ? METHOD_LABEL[method] : undefined
  const message = reason?.trim() ? reason.trim().slice(0, 160) : "Payment not completed"
  const returns = policies?.current
  const taxName = countryCode.toLowerCase() === "in" ? "Integrated GST" : "Tax"
  const taxLabel = region?.taxRate ? `${taxName} (${region.taxRate}%)` : taxName
  const taxIncluded = Boolean(region?.taxInclusive) && totals.taxTotal === 0

  return (
    <StitchPage>
      <CheckoutHeader />
      <main className="w-full pt-20 bg-background min-h-screen" data-testid="payment-failed">
        <div className="flex flex-col w-full">
          <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-space-lg md:py-space-xl">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-space-xs text-on-surface-variant mb-space-xl overflow-x-auto whitespace-nowrap scrollbar-none"
            >
              <LocalizedClientLink
                href="/checkout"
                className="font-label-caps text-label-caps uppercase tracking-wider text-outline hover:text-primary transition-colors"
              >
                Checkout
              </LocalizedClientLink>
              <MIcon name="chevron_right" className="text-[14px] text-outline" />
              <LocalizedClientLink
                href="/checkout?step=payment"
                className="font-label-caps text-label-caps uppercase tracking-wider text-outline hover:text-primary transition-colors"
              >
                Payment Settlement
              </LocalizedClientLink>
              <MIcon name="chevron_right" className="text-[14px] text-outline" />
              <span
                aria-current="page"
                className="font-label-caps text-label-caps uppercase tracking-wider text-error font-semibold flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                Authorization Interrupted
              </span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
              <div className="lg:col-span-8 flex flex-col gap-space-lg min-w-0">
                <div className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-error via-on-tertiary-container to-secondary" />
                  <div className="flex flex-col md:flex-row items-start justify-between gap-space-md mb-space-md">
                    <div className="flex items-center gap-space-md">
                      <div className="w-12 h-12 rounded-full bg-error-container/30 flex items-center justify-center text-error shrink-0">
                        <span
                          aria-hidden
                          className="material-symbols-outlined text-[28px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          shield_with_heart
                        </span>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container/40 text-on-error-container font-label-caps text-label-caps uppercase tracking-wider mb-1">
                          Payment Authorization Unsuccessful
                        </span>
                        <h1 className="font-headline-lg text-headline-lg text-on-surface font-normal">
                          We couldn’t complete your transaction
                        </h1>
                      </div>
                    </div>
                    {/* The design's "hold window" countdown: nothing is held, so the pill names the attempt instead. */}
                    {failedLabel && (
                      <div className="flex items-center gap-2 bg-surface-container-high px-3.5 py-1.5 rounded-full self-start md:self-center shadow-inner shrink-0">
                        <MIcon name="sync_problem" className="text-[16px] text-on-tertiary-container" />
                        <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                          Attempted:
                        </span>
                        <span className="font-label-caps text-label-caps font-bold tracking-widest text-on-surface text-[12px]">
                          {failedLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="bg-surface-container-low p-space-md rounded-lg mb-space-md space-y-space-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-on-surface-variant font-label-sm text-label-sm">
                      <span className="uppercase tracking-wider text-outline font-semibold shrink-0">Diagnostic Reference</span>
                      <span
                        className="font-mono text-on-surface bg-surface-container-highest px-2 py-0.5 rounded break-words min-w-0 sm:text-right"
                        data-testid="payment-failed-reason"
                      >
                        {message}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface leading-relaxed pt-1">
                      Your {failedLabel ? `${failedLabel} ` : ""}payment of{" "}
                      <span className="font-medium text-primary">{money(totals.total)}</span> was not completed, so no
                      order was placed. No funds were debited by Everwear. If your bank briefly retained an amount, it
                      will auto-release it within 24–48 hours.
                    </p>
                  </div>

                  <div className="flex items-center gap-space-sm p-3.5 bg-surface-container rounded-lg text-on-surface">
                    <MIcon name="shopping_bag" className="text-secondary text-[20px] shrink-0" />
                    <p className="font-body-sm text-body-sm">
                      <strong className="font-medium">Your bag is saved:</strong> all {count}{" "}
                      {count === 1 ? "item is" : "items are"} still in your bag, so you can retry or switch methods
                      without adding anything again.
                    </p>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-space-lg">
                    <div>
                      <span className="font-label-caps text-label-caps uppercase tracking-wider text-outline">
                        Resolution Chamber
                      </span>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">Select Instant Recovery Method</h2>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                      <MIcon name="verified_user" className="text-[16px] text-primary" />
                      128-Bit Enclave Secured
                    </span>
                  </div>
                  <RecoveryMethods failedMethod={failed} total={money(totals.total)} methods={payments.methods} />
                </div>

                <div className="p-space-lg bg-surface-container-high rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
                  <div className="flex items-center gap-space-md">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0">
                      <MIcon name="support_agent" className="text-[20px]" />
                    </div>
                    <div>
                      <span className="font-label-caps text-label-caps uppercase tracking-wider text-outline block">
                        Dedicated Atelier Assistance
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface font-medium">
                        Encountering repeated authorization declines? Our client relations team can help you complete
                        your order.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-sm w-full md:w-auto">
                    {seller.phone ? (
                      <a
                        className="flex-1 md:flex-initial h-10 px-4 bg-surface-container-lowest hover:bg-surface text-on-surface font-label-caps text-label-caps uppercase tracking-wider rounded flex items-center justify-center gap-1.5 shadow-sm transition-colors whitespace-nowrap"
                        href={`tel:${seller.phone.replace(/[^\d+]/g, "")}`}
                      >
                        <MIcon name="call" className="text-[16px]" />
                        {seller.phone}
                      </a>
                    ) : (
                      <LocalizedClientLink
                        className="flex-1 md:flex-initial h-10 px-4 bg-surface-container-lowest hover:bg-surface text-on-surface font-label-caps text-label-caps uppercase tracking-wider rounded flex items-center justify-center gap-1.5 shadow-sm transition-colors whitespace-nowrap"
                        href="/contact"
                      >
                        <MIcon name="mail" className="text-[16px]" />
                        Contact us
                      </LocalizedClientLink>
                    )}
                    <LocalizedClientLink
                      className="flex-1 md:flex-initial h-10 px-4 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition-colors whitespace-nowrap"
                      href="/concierge"
                    >
                      <MIcon name="chat" className="text-[16px]" />
                      Concierge
                    </LocalizedClientLink>
                  </div>
                </div>
              </div>

              <aside className="lg:col-span-4 lg:sticky top-24 space-y-space-md min-w-0">
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-space-md">
                    <div className="flex items-center gap-2">
                      <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">
                        Your Vault Bag
                      </span>
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                    </div>
                    <span className="font-mono text-xs text-outline">
                      {count} {count === 1 ? "Item" : "Items"}
                    </span>
                  </div>

                  <div className="space-y-space-md divide-y divide-surface-container-high">
                    {items.map((item, i) => (
                      <div key={item.id} className={`${i === 0 ? "pt-space-xs" : "pt-space-md"} flex gap-space-md`}>
                        <div className="w-20 h-24 bg-surface-container-low rounded overflow-hidden shrink-0 relative">
                          {item.thumbnail ? (
                            <Image
                              src={item.thumbnail}
                              alt={item.productTitle}
                              fill
                              sizes="80px"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-outline">
                              <MIcon name="checkroom" className="text-[24px]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            {details[i].eyebrow && (
                              <span className="font-label-caps text-[0.65rem] uppercase text-outline tracking-wider">
                                {details[i].eyebrow}
                              </span>
                            )}
                            <LocalizedClientLink href={`/products/${item.productHandle}`}>
                              <h3 className="font-body-md text-body-md font-medium text-on-surface leading-tight">
                                {item.productTitle}
                              </h3>
                            </LocalizedClientLink>
                            {details[i].variant && (
                              <p className="font-body-sm text-body-sm text-on-surface-variant">{details[i].variant}</p>
                            )}
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="font-label-sm text-label-sm text-outline">
                              Qty: {String(item.quantity).padStart(2, "0")}
                            </span>
                            <span className="font-body-md text-body-md font-medium text-on-surface">
                              {money(item.total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-space-lg pt-space-md bg-surface-container-low p-space-md rounded-lg space-y-2">
                    <div className="flex justify-between gap-2 text-body-sm text-on-surface-variant">
                      <span>Curated Subtotal</span>
                      <span>{money(totals.itemSubtotal)}</span>
                    </div>
                    {totals.discountTotal > 0 && (
                      <div className="flex justify-between gap-2 text-body-sm text-on-surface-variant">
                        <span>Privilege Discount</span>
                        <span>−{money(totals.discountTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 text-body-sm text-on-surface-variant">
                      <span>Shipping &amp; Hand Delivery</span>
                      <span className="text-on-surface font-medium">
                        {totals.shippingTotal > 0 ? money(totals.shippingTotal) : "Complimentary"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 text-body-sm text-on-surface-variant">
                      <span>{taxLabel}</span>
                      <span>{taxIncluded ? "Included" : money(totals.taxTotal)}</span>
                    </div>
                    <div className="pt-2 flex justify-between items-baseline text-on-surface font-medium">
                      <span className="font-headline-sm text-headline-sm">Total Payable</span>
                      <span className="font-headline-sm text-headline-sm tracking-tight text-primary">
                        {money(totals.total)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-space-md space-y-2.5">
                    <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                      <MIcon name="verified" className="text-[16px] text-primary" />
                      <span>100% Genuine Provenance Guaranteed</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                      <MIcon name="lock" className="text-[16px] text-primary" />
                      <span>Cryptographically Sealed Transaction</span>
                    </div>
                    {returns && (
                      <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                        <MIcon name="undo" className="text-[16px] text-primary" />
                        <span>
                          {returns.freeReturns ? "Complimentary Returns" : "Returns"} Within {returns.returnWindowDays}{" "}
                          Days
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-space-lg pt-space-xs flex flex-col gap-2">
                    <LocalizedClientLink
                      className="w-full text-center py-2.5 text-on-surface-variant hover:text-primary font-label-caps text-label-caps uppercase tracking-wider transition-colors"
                      href="/cart"
                    >
                      Return to Shopping Bag
                    </LocalizedClientLink>
                  </div>
                </div>
                <div className="p-space-md bg-surface-container rounded-lg text-on-surface-variant font-body-sm text-body-sm flex items-start gap-3">
                  <MIcon name="inventory_2" className="text-[20px] text-on-surface shrink-0" />
                  <p>
                    Items in your bag are not reserved while you retry. Stock is confirmed when your order is placed,
                    with no penalties or re-stocking tariffs.
                  </p>
                </div>
              </aside>
            </div>
          </section>
        </div>
      </main>
      <CheckoutFooter />
    </StitchPage>
  )
}
