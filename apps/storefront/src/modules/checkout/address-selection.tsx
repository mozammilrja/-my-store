"use client"

import type { Address, Cart } from "@lib/api/types"
import { deliveryDays } from "@lib/util/policies"
import Image from "next/image"
import type { ReactNode } from "react"
import { type CheckoutRegion, cityLine, fullName, itemCount, money, returnsLine, streetLine, taxLabel, variantLine } from "./checkout-data"
import { CheckoutStepper } from "./checkout-stepper"
import { MIcon } from "./m-icon"
import { PromoField } from "./promo-field"

/*
 * The checkout_address_selection_modern_trending export: promo ticker, the
 * "Checkout Sequence" stage bar, a two-column grid of address tiles and the
 * Order Summary card. The address step supplies the data and handlers.
 */

/** Ticker, stage bar and the 8 + 4 grid. */
export function AddressSelectionFrame({ ticker, children, aside }: { ticker: string; children: ReactNode; aside: ReactNode }) {
  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full">
        {ticker && (
          <section className="w-full bg-surface-container-high py-space-xs px-margin-mobile md:px-margin text-center">
            <div className="max-w-[1440px] mx-auto flex items-center justify-center gap-space-sm text-on-surface-variant">
              <MIcon name="local_shipping" className="text-[15px] text-secondary" />
              <p className="font-label-caps text-label-caps uppercase tracking-wider">{ticker}</p>
            </div>
          </section>
        )}
        <section className="w-full py-space-lg">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-xs font-label-caps text-label-caps tracking-widest uppercase text-on-surface-variant">
                <span>Checkout Sequence</span>
                <span className="text-outline">/</span>
                <span className="text-primary font-medium">Stage 01 of 04</span>
              </div>
              <CheckoutStepper current="address" />
              <div className="hidden lg:flex items-center gap-space-xs text-on-surface-variant">
                <MIcon name="lock" className="text-[16px]" />
                <span className="font-label-sm text-label-sm">Encrypted Protocol 256-bit</span>
              </div>
            </div>
          </div>
        </section>
        <div className="w-full pb-margin">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-space-lg min-w-0" data-testid="address-step">
                {children}
              </div>
              <aside className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28 min-w-0" aria-label="Order summary">
                {aside}
              </aside>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

/** "Destination Point / Select Delivery Address" with the Add New Address button. */
export function AddressSelectionTitle({ onAdd, expanded, id }: { onAdd?: () => void; expanded?: boolean; id?: string }) {
  return (
    <div id={id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm scroll-mt-40">
      <div>
        <div className="flex items-center gap-space-xs text-on-surface-variant mb-1">
          <MIcon name="location_on" className="text-[18px]" />
          <span className="font-label-caps text-label-caps uppercase tracking-widest">Destination Point</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Select Delivery Address</h1>
      </div>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-expanded={expanded}
          aria-controls="new-address-form"
          className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container-low text-primary font-label-md text-label-md rounded-lg shadow-sm hover:bg-surface-container transition-colors self-start sm:self-auto"
          data-testid="register-address-button"
        >
          <MIcon name="add" className="text-[18px]" />
          <span>Add New Address</span>
        </button>
      )}
    </div>
  )
}

/** One saved address in the grid: selected tiles get the black outline. */
export function AddressTile({
  address,
  selected,
  isDefault,
  onSelect,
  onEdit,
  onRemove,
  disabled,
  note,
}: {
  address: Address
  selected: boolean
  isDefault: boolean
  onSelect: () => void
  onEdit: () => void
  onRemove: () => void
  disabled?: boolean
  /** Left side of the footer strip, e.g. the standard delivery time. */
  note: string
}) {
  const tag = isDefault ? "Default" : address.company
  return (
    <label
      className={`relative flex flex-col justify-between p-space-md rounded-lg cursor-pointer transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
        selected
          ? "bg-surface-container-lowest shadow-md outline-2 outline-primary -outline-offset-2"
          : "bg-surface-container-low shadow-sm hover:shadow-md hover:bg-surface-container-lowest"
      }`}
      data-testid={selected ? "selected-address-card" : "address-card"}
    >
      <div>
        <div className="flex items-center justify-between gap-space-sm mb-space-sm">
          <div className="flex items-center gap-space-sm min-w-0">
            <input
              type="radio"
              name="delivery_address"
              className="w-4 h-4 accent-primary cursor-pointer shrink-0"
              checked={selected}
              onChange={onSelect}
              disabled={disabled}
            />
            <span className="font-headline-sm text-headline-sm text-on-surface font-medium truncate">{fullName(address)}</span>
          </div>
          {tag && (
            <span
              className={`px-space-xs py-0.5 font-label-caps text-label-caps uppercase rounded shrink-0 ${
                isDefault ? "bg-surface-container-high text-on-surface" : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {tag}
            </span>
          )}
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant mb-space-xs">{streetLine(address)}</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{cityLine(address)}</p>
        {address.phone && (
          <div className="mt-space-sm flex items-center gap-space-xs text-on-surface font-body-sm text-body-sm">
            <MIcon name="call" className="text-[15px] text-outline" />
            <span>{address.phone}</span>
          </div>
        )}
      </div>
      <div
        className={`mt-space-md flex items-center justify-between gap-space-sm px-space-sm py-space-xs rounded ${
          selected ? "bg-surface-container-low" : "bg-surface-container-high/60"
        }`}
      >
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase truncate">{note}</span>
        <div className="flex items-center gap-space-sm shrink-0">
          <button
            type="button"
            className="font-label-caps text-label-caps text-primary hover:text-secondary uppercase min-h-6"
            onClick={(e) => {
              e.preventDefault()
              onEdit()
            }}
            disabled={disabled}
          >
            Edit
          </button>
          <span className="text-outline-variant" aria-hidden>
            •
          </span>
          <button
            type="button"
            className="font-label-caps text-label-caps text-on-surface-variant hover:text-error uppercase min-h-6"
            onClick={(e) => {
              e.preventDefault()
              onRemove()
            }}
            disabled={disabled}
            data-testid="remove-address"
          >
            Remove
          </button>
        </div>
      </div>
    </label>
  )
}

/** The footer note on each tile: the region's standard delivery time, when known. */
export const tileNote = (region: CheckoutRegion) =>
  region.policies ? `Standard: ${deliveryDays(region.policies).replace("-", "–")} working days` : "Courier delivery"

/** "Use GSTIN for commercial tax invoice (Optional)" with its two fields. */
export function GstinToggle({
  on,
  onToggle,
  gstin,
  onGstin,
  legalName,
  onLegalName,
  errors,
}: {
  on: boolean
  onToggle: (v: boolean) => void
  gstin: string
  onGstin: (v: string) => void
  legalName: string
  onLegalName: (v: string) => void
  errors: { gstin?: string; legalName?: string }
}) {
  const input = "w-full h-11 px-space-md bg-surface-container-lowest text-on-surface font-body-sm text-body-sm rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  const label = "block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1"
  return (
    <div className="p-space-md bg-surface-container-low rounded-lg shadow-sm">
      <label className="flex items-center gap-space-sm cursor-pointer select-none">
        <input
          className="w-4 h-4 accent-primary cursor-pointer"
          id="gstin-toggle"
          type="checkbox"
          checked={on}
          onChange={(e) => onToggle(e.target.checked)}
          data-testid="gstin-toggle"
        />
        <span className="font-body-md text-body-md text-on-surface font-medium">Use GSTIN for commercial tax invoice (Optional)</span>
      </label>
      {on && (
        <div className="mt-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-md" id="gstin-fields">
          <div>
            <label htmlFor="gstin-number" className={label}>
              GSTIN Number
            </label>
            <input
              id="gstin-number"
              className={`${input} uppercase`}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              value={gstin}
              onChange={(e) => onGstin(e.target.value.toUpperCase())}
              aria-invalid={!!errors.gstin}
              data-testid="gstin-number-input"
            />
            {errors.gstin && <p className="mt-1 font-label-sm text-label-sm text-error">{errors.gstin}</p>}
          </div>
          <div>
            <label htmlFor="gstin-legal-name" className={label}>
              Registered Entity Name
            </label>
            <input
              id="gstin-legal-name"
              className={input}
              placeholder="Legal registered trade name"
              value={legalName}
              onChange={(e) => onLegalName(e.target.value)}
              aria-invalid={!!errors.legalName}
              data-testid="gstin-legal-name-input"
            />
            {errors.legalName && <p className="mt-1 font-label-sm text-label-sm text-error">{errors.legalName}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

/** "Climate-Calibrated Packaging" assurance strip. */
export function PackagingNote() {
  return (
    <div className="p-space-md bg-surface-container-lowest rounded-lg shadow-sm flex items-center justify-between gap-space-md">
      <div className="flex items-center gap-space-md">
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary shrink-0">
          <MIcon name="inventory_2" className="text-[20px]" />
        </div>
        <div>
          <h2 className="font-label-md text-label-md text-on-surface font-semibold">Climate-Calibrated Packaging</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Garments are layered in unbleached organic linen slips with cedarwood tags.</p>
        </div>
      </div>
      <span className="hidden md:inline-block font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider">Certified</span>
    </div>
  )
}

/** The export's Order Summary card. */
export function AddressOrderSummary({
  cart,
  region,
  cta,
}: {
  cart: Cart
  region: CheckoutRegion
  cta: { label: string; onClick: () => void; pending: boolean }
}) {
  const n = itemCount(cart)
  const option = cart.shippingOptions.find((o) => o.id === cart.shippingOptionId) ?? null
  return (
    <div className="flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-lg shadow-md">
      <div className="flex items-center justify-between pb-space-sm">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-medium">Order Summary</h2>
        <span className="px-space-sm py-0.5 bg-surface-container text-on-surface-variant font-label-caps text-label-caps uppercase rounded-full">
          {n} {n === 1 ? "Item" : "Items"}
        </span>
      </div>

      <ul className="flex flex-col gap-space-sm" data-testid="items-table">
        {cart.items.map((item) => (
          <li key={item.id} className="flex gap-space-md p-space-sm bg-surface-container-low rounded-lg" data-testid="product-row">
            <div className="w-20 h-24 overflow-hidden rounded bg-surface-container-high flex-shrink-0 relative">
              {item.thumbnail && <Image src={item.thumbnail} alt={item.productTitle} fill sizes="80px" className="object-cover" />}
            </div>
            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <h3 className="font-body-md text-body-md text-on-surface font-medium truncate" data-testid="product-title">
                  {item.productTitle}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {[variantLine(item) && `Size: ${variantLine(item)}`, `Qty: ${item.quantity}`].filter(Boolean).join(" • ")}
                </p>
              </div>
              <div className="flex items-baseline justify-end mt-space-xs">
                <span className="font-headline-sm text-headline-sm text-primary font-medium tabular-nums">{money(cart, item.total)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <PromoField applied={cart.promoCodes} variant="address" />

      <div className="flex flex-col gap-space-xs pt-space-sm font-body-sm text-body-sm">
        <div className="flex justify-between text-on-surface-variant">
          <span>Bag Total</span>
          <span className="text-on-surface font-medium tabular-nums">{money(cart, cart.totals.itemSubtotal)}</span>
        </div>
        {cart.totals.discountTotal > 0 && (
          <div className="flex justify-between text-secondary">
            <span>Coupon Discount</span>
            <span className="font-medium tabular-nums">-{money(cart, cart.totals.discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-on-surface-variant">
          <span>Delivery Fee</span>
          {option ? (
            <span className="text-on-surface font-semibold tracking-wide">
              {cart.totals.shippingTotal === 0 ? "FREE" : money(cart, cart.totals.shippingTotal)}
            </span>
          ) : (
            <span>Chosen at next step</span>
          )}
        </div>
        <div className="flex justify-between text-on-surface-variant">
          <span>{taxLabel(region)}</span>
          <span className="text-on-surface font-medium tabular-nums">{money(cart, cart.totals.taxTotal)}</span>
        </div>
        <div className="mt-space-sm bg-surface-container-low p-space-md rounded flex items-center justify-between gap-space-sm">
          <div>
            <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block">Total Payable</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">All taxes included</span>
          </div>
          <span className="font-headline-xl text-headline-xl max-md:text-[2rem] text-primary font-medium tracking-tight tabular-nums" data-testid="checkout-total">
            {money(cart, cart.totals.total)}
          </span>
        </div>
      </div>

      <div className="pt-space-xs">
        <button
          type="button"
          onClick={cta.onClick}
          disabled={cta.pending}
          className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-space-sm rounded-lg hover:bg-surface-variant hover:text-on-surface transition-all duration-200 shadow-md group disabled:opacity-60"
          data-testid="checkout-continue-button"
        >
          <span>{cta.pending ? "Saving…" : cta.label}</span>
          <MIcon name="arrow_forward" className="text-[18px] group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="pt-space-sm flex flex-col gap-space-xs text-on-surface-variant">
        <div className="flex items-center gap-space-xs font-label-sm text-label-sm">
          <MIcon name="verified_user" className="text-[16px] text-primary" />
          <span>256-bit Bank-Grade SSL Secure Checkout</span>
        </div>
        <div className="flex items-center gap-space-xs font-label-sm text-label-sm">
          <MIcon name="inventory_2" className="text-[16px] text-primary" />
          <span>Every piece hand-inspected before dispatch</span>
        </div>
        <div className="flex items-center gap-space-xs font-label-sm text-label-sm">
          <MIcon name="published_with_changes" className="text-[16px] text-primary" />
          <span>{returnsLine(region.policies)}</span>
        </div>
      </div>
    </div>
  )
}
