import { retrieveCart } from "@lib/data/shop"
import { formatMoney } from "@lib/money"
import { RecoveryMethods } from "@modules/checkout/recovery-methods"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Payment Authorization Unsuccessful | Everwear",
  robots: { index: false },
}

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span aria-hidden className={`material-symbols-outlined ${className}`}>
    {name}
  </span>
)

type Method = "upi" | "card" | "netbanking" | "cod"

/**
 * Pixel-accurate implementation of Stitch:
 * storefront_checkout_payment_declined_recovery_hub
 */
export default async function PaymentFailed(props: {
  searchParams: Promise<{ reason?: string; method?: string }>
}) {
  const { reason, method } = await props.searchParams
  const cart = await retrieveCart().catch(() => null)
  if (!cart || cart.items.length === 0) notFound()

  const money = (n: number) => formatMoney(n, cart.currency)
  const failed: Method =
    method === "card" || method === "netbanking" || method === "upi" ? method : "upi"
  const count = cart.items.reduce((n, i) => n + i.quantity, 0)
  const t = cart.totals

  return (
    <div className="w-full bg-surface min-h-screen" data-testid="payment-failed">
      <div className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-space-lg md:py-space-xl">
        {/* Stitch Breadcrumb */}
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
          <Icon name="chevron_right" className="text-[14px] text-outline" />
          <LocalizedClientLink
            href="/checkout?step=payment"
            className="font-label-caps text-label-caps uppercase tracking-wider text-outline hover:text-primary transition-colors"
          >
            Payment Settlement
          </LocalizedClientLink>
          <Icon name="chevron_right" className="text-[14px] text-outline" />
          <span className="font-label-caps text-label-caps uppercase tracking-wider text-error font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
            Authorization Interrupted
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* Left Column (8 cols): What happened, recovery options & concierge */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            {/* Error banner card */}
            <div className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-error via-on-tertiary-container to-secondary" />

              <div className="flex flex-col md:flex-row items-start justify-between gap-space-md mb-space-md">
                <div className="flex items-center gap-space-md">
                  <div className="w-12 h-12 rounded-full bg-error-container/30 flex items-center justify-center text-error shrink-0">
                    <Icon name="shield_with_heart" className="text-[28px]" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container/40 text-on-error-container font-label-caps text-label-caps uppercase tracking-wider mb-1">
                      Payment Authorization Unsuccessful
                    </span>
                    <h1 className="font-headline-lg text-headline-lg text-on-surface font-normal">
                      We couldn&apos;t complete your transaction
                    </h1>
                  </div>
                </div>

                {/* Vault hold countdown window */}
                <div className="flex items-center gap-2 bg-surface-container-high px-3.5 py-1.5 rounded-full self-start md:self-center shadow-inner shrink-0">
                  <Icon
                    name="timelapse"
                    className="text-[16px] text-on-tertiary-container animate-spin"
                  />
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                    Hold Window:
                  </span>
                  <span
                    className="font-label-caps text-label-caps font-bold tracking-widest text-on-surface text-[12px]"
                    id="recovery-timer"
                  >
                    29:45
                  </span>
                </div>
              </div>

              {/* Diagnostic Box */}
              <div className="bg-surface-container-low p-space-md rounded-lg mb-space-md space-y-space-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-on-surface-variant font-label-sm text-label-sm">
                  <span className="uppercase tracking-wider text-outline font-semibold">
                    Diagnostic Reference
                  </span>
                  <span
                    className="font-mono text-on-surface bg-surface-container-highest px-2 py-0.5 rounded text-xs"
                    data-testid="payment-failed-reason"
                  >
                    {reason ? reason.slice(0, 100) : "BANK_DECLINED_LIMIT / 3DS_TIMEOUT"}
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface leading-relaxed pt-1">
                  Your issuing bank did not authorize the settlement of{" "}
                  <span className="font-medium text-primary">{money(t.total)}</span>. No funds
                  were debited from your account. If an amount was temporarily held, your bank will
                  auto-release it within 24–48 hours.
                </p>
              </div>

              {/* Vault Hold Guarantee */}
              <div className="flex items-center gap-space-sm p-3.5 bg-surface-container rounded-lg text-on-surface">
                <Icon name="lock_clock" className="text-secondary text-[20px] shrink-0" />
                <p className="font-body-sm text-body-sm">
                  <strong className="font-medium">Vault Hold Guarantee:</strong> We have locked
                  your curated garments (Batch <span className="font-mono text-xs">#EVR-1056</span>
                  ) so another client cannot purchase them while you reauthorize.
                </p>
              </div>
            </div>

            {/* Resolution Chamber */}
            <div className="bg-surface-container-lowest p-space-lg md:p-space-xl rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-space-lg">
                <div>
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-outline">
                    Resolution Chamber
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    Select Instant Recovery Method
                  </h2>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                  <Icon name="verified_user" className="text-[16px] text-primary" />
                  128-Bit Enclave Secured
                </span>
              </div>

              <RecoveryMethods failedMethod={failed} total={money(t.total)} />
            </div>

            {/* Dedicated Atelier Assistance */}
            <div className="p-space-lg bg-surface-container-high rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0">
                  <Icon name="support_agent" className="text-[20px]" />
                </div>
                <div>
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-outline block">
                    Dedicated Atelier Assistance
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">
                    Encountering repeated authorization declines? Our concierge can initiate an
                    escrow link.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-sm w-full md:w-auto">
                <a
                  href="tel:+919876543210"
                  className="flex-1 md:flex-initial h-10 px-4 bg-surface-container-lowest hover:bg-surface text-on-surface font-label-caps text-label-caps uppercase tracking-wider rounded flex items-center justify-center gap-1.5 shadow-sm transition-colors whitespace-nowrap"
                >
                  <Icon name="call" className="text-[16px]" />
                  +91 98765 43210
                </a>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-initial h-10 px-4 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded flex items-center justify-center gap-1.5 shadow-sm hover:bg-primary-container transition-colors whitespace-nowrap"
                >
                  <Icon name="chat" className="text-[16px]" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols Sticky): Reserved Vault Bag */}
          <aside className="lg:col-span-4 sticky top-24 space-y-space-md">
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-2">
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-semibold">
                    Reserved Vault Bag
                  </span>
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                </div>
                <span className="font-mono text-xs text-outline">
                  {count} {count === 1 ? "Item" : "Items"}
                </span>
              </div>

              <div className="space-y-space-md divide-y divide-surface-container-high">
                {cart.items.map((item) => (
                  <div key={item.id} className="pt-space-md first:pt-0 flex gap-space-md">
                    <div className="w-20 h-24 bg-surface-container-low rounded overflow-hidden shrink-0 relative">
                      {item.thumbnail ? (
                        <Image
                          src={item.thumbnail}
                          alt={item.productTitle}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          Item
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <span className="font-label-caps text-[0.65rem] uppercase text-outline tracking-wider">
                          Garment • Atelier
                        </span>
                        <h3 className="font-body-md text-body-md font-medium text-on-surface leading-tight">
                          {item.productTitle}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {item.variantTitle ? `Size: ${item.variantTitle} • ` : ""}Qty: {item.quantity}
                        </p>
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

              <div className="mt-space-lg pt-space-md bg-surface-container-low p-space-md rounded-lg space-y-2 font-body-sm text-body-sm">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Curated Subtotal</span>
                  <span className="text-on-surface font-medium">{money(t.itemSubtotal)}</span>
                </div>
                {t.discountTotal > 0 && (
                  <div className="flex justify-between text-secondary">
                    <span>Privilege Discount</span>
                    <span>−{money(t.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-on-surface-variant">
                  <span>Vault Insurance &amp; Hand Delivery</span>
                  <span className="text-on-surface font-medium">Complimentary</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Integrated GST (Inclusive)</span>
                  <span className="text-on-surface">
                    {t.taxTotal > 0 ? money(t.taxTotal) : "Included"}
                  </span>
                </div>
                <div className="pt-2 flex justify-between items-baseline text-on-surface font-medium border-t border-surface-container">
                  <span className="font-headline-sm text-headline-sm">Total Payable</span>
                  <span className="font-headline-sm text-headline-sm tracking-tight text-primary">
                    {money(t.total)}
                  </span>
                </div>
              </div>

              <LocalizedClientLink
                href="/cart"
                className="mt-space-md block text-center font-label-md text-label-md uppercase tracking-wider text-primary hover:underline"
              >
                Return to shopping bag
              </LocalizedClientLink>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
