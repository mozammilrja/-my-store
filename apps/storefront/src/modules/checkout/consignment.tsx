"use client"

import type { Address, Cart, Customer, ShippingOption } from "@lib/api/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import type { ReactNode } from "react"
import {
  type CheckoutRegion,
  type CheckoutStep,
  cityLine,
  deliveryEstimate,
  deliveryEstimateShort,
  fullName,
  itemCount,
  money,
  returnsLine,
  streetLine,
  taxLabel,
  variantLine,
} from "./checkout-data"
import { CheckoutStepper } from "./checkout-stepper"
import { MIcon } from "./m-icon"
import { PromoField } from "./promo-field"

/*
 * Pieces of the storefront_checkout_shipping_delivery_selection export shared
 * by the address step (its Phase 01) and the review step (Phase 01 + 02), so
 * the two stay identical: page frame with the sticky stepper row, Phase 01
 * title, address cards, the register-address row, the GSTIN block, and the
 * "Order Consignment" summary with its trust panel.
 */

/** Page frame: sticky protocol/stepper row, then the 8 + 4 column grid. */
export function ConsignmentFrame({
  current,
  crumb,
  children,
  aside,
  testId,
}: {
  current: CheckoutStep
  crumb: string
  children: ReactNode
  aside: ReactNode
  testId: string
}) {
  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full">
        <section className="w-full bg-surface-container-lowest/80 backdrop-blur-md sticky top-20 z-40 shadow-sm">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-md">
            <div className="flex flex-col gap-space-sm lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="flex items-center gap-space-xs font-label-caps text-label-caps uppercase text-on-surface-variant min-w-0">
                <span className="text-primary font-semibold tracking-widest">Protocol</span>
                <span>/</span>
                <span className="truncate">{crumb}</span>
              </div>
              <CheckoutStepper current={current} />
              <div className="hidden lg:block" aria-hidden />
            </div>
          </div>
        </section>
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            <div className="lg:col-span-8 flex flex-col gap-space-xl min-w-0" data-testid={testId}>
              {children}
            </div>
            <aside className="lg:col-span-4 lg:sticky lg:top-36 flex flex-col gap-space-md min-w-0" aria-label="Order summary">
              {aside}
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-space-sm p-space-md bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm" role="alert" data-testid="checkout-error">
      <MIcon name="error" className="text-[20px]" />
      <span>{message}</span>
    </div>
  )
}

/** "Phase 01 / Destination Specification" title with the client pill. */
export function PhaseOneTitle({ customer, id }: { customer: Customer | null; id?: string }) {
  return (
    <div id={id} className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-space-sm scroll-mt-40">
      <div>
        <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant block mb-space-xs">Phase 01 / Destination Specification</span>
        <h1 className="font-headline-xl text-headline-xl text-primary font-normal max-md:text-[2rem]">Select Consignment Address</h1>
      </div>
      <div className="flex items-center gap-space-xs px-space-md py-1 bg-surface-container-high rounded-full self-start sm:self-auto min-w-0 max-w-full">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" aria-hidden />
        <span className="font-label-caps text-label-caps uppercase text-on-surface truncate">
          {customer ? `Client: ${fullName({ firstName: customer.firstName ?? "", lastName: customer.lastName ?? "" }) || customer.email}` : "Guest Checkout"}
        </span>
      </div>
    </div>
  )
}

/** The export's round radio (filled black when chosen). */
export function CheckRadio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`w-5 h-5 rounded-full shadow-sm flex items-center justify-center transition-colors shrink-0 ${checked ? "bg-primary" : "bg-surface-container"}`}
    />
  )
}

/** A saved/delivery address card. `edit` is a button handler or a link. */
export function AddressCard({
  address,
  selected,
  isDefault,
  onSelect,
  edit,
  disabled,
  deliverable,
}: {
  address: Address
  selected: boolean
  isDefault: boolean
  onSelect: () => void
  edit: { onClick: () => void } | { href: string }
  disabled?: boolean
  deliverable: boolean
}) {
  const editClass = "font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors py-1 px-space-xs shrink-0"
  return (
    <div
      className={`relative p-space-lg rounded-lg shadow-sm transition-all duration-300 cursor-pointer ${
        selected ? "bg-surface-container-lowest" : "bg-surface-container-lowest/60 hover:bg-surface-container-lowest"
      }`}
      onClick={onSelect}
      data-testid={selected ? "selected-address-card" : "address-card"}
    >
      <div className="flex items-start justify-between gap-space-md">
        <label className="flex items-start gap-space-md cursor-pointer min-w-0">
          <input type="radio" className="sr-only" name="delivery_address" checked={selected} onChange={onSelect} disabled={disabled} />
          <span className="mt-1">
            <CheckRadio checked={selected} />
          </span>
          <div className="flex flex-col gap-space-xs min-w-0">
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="font-headline-sm text-headline-sm text-primary font-medium">{fullName(address)}</span>
              {isDefault && <span className="px-space-xs py-0.5 bg-primary text-on-primary font-label-caps text-label-caps uppercase rounded-sm">Default</span>}
              {address.company && (
                <span className="px-space-xs py-0.5 bg-surface-container text-on-surface-variant font-label-caps text-label-caps uppercase rounded-sm">{address.company}</span>
              )}
            </div>
            <p className="font-body-md text-body-md text-on-surface mt-1 leading-relaxed">
              {streetLine(address)}
              <br />
              {cityLine(address)}
            </p>
            <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 mt-2 text-on-surface-variant font-body-sm text-body-sm">
              {address.phone && (
                <>
                  <span className="flex items-center gap-1">
                    <MIcon name="call" className="text-[16px]" /> {address.phone}
                  </span>
                  <span aria-hidden>•</span>
                </>
              )}
              <span className="flex items-center gap-1">
                <MIcon name="local_shipping" className="text-[16px]" />
                {deliverable ? "Delivered from this store" : "Outside this store's region"}
              </span>
            </div>
          </div>
        </label>
        {"href" in edit ? (
          <LocalizedClientLink href={edit.href} onClick={(e) => e.stopPropagation()} className={editClass}>
            Edit
          </LocalizedClientLink>
        ) : (
          <button
            type="button"
            className={editClass}
            onClick={(e) => {
              e.stopPropagation()
              edit.onClick()
            }}
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

const registerClass =
  "w-full py-space-md px-space-lg bg-surface-container-low hover:bg-surface-container rounded-lg flex items-center justify-center gap-space-xs text-primary font-label-caps text-label-caps uppercase tracking-wider transition-all duration-200"

/** "+ Register new architectural address" row. */
export function RegisterAddressRow(props: { onClick: () => void; expanded?: boolean } | { href: string }) {
  const inner = (
    <>
      <MIcon name="add" className="text-[18px]" />
      <span>Register New Architectural Address</span>
    </>
  )
  if ("href" in props) {
    return (
      <LocalizedClientLink href={props.href} className={registerClass}>
        {inner}
      </LocalizedClientLink>
    )
  }
  return (
    <button type="button" className={registerClass} onClick={props.onClick} aria-expanded={props.expanded} aria-controls="new-address-form" data-testid="register-address-button">
      {inner}
    </button>
  )
}

/** Field style of the export's form inputs (the GSTIN fields). */
export const consignmentInput =
  "w-full h-11 px-space-md bg-surface-container-lowest font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none rounded-sm shadow-inner"
export const consignmentLabel = "font-label-caps text-label-caps uppercase text-on-surface-variant block mb-space-xs"

/** "Supply Business Tax Credentials (GSTIN)" block. */
export function GstinBlock({
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
  return (
    <div className="p-space-lg bg-surface-container-low rounded-lg shadow-sm">
      <label className="flex items-start gap-space-md cursor-pointer select-none">
        <input
          className="mt-1 w-4 h-4 rounded-sm accent-primary text-on-primary"
          id="gstin-toggle"
          type="checkbox"
          checked={on}
          onChange={(e) => onToggle(e.target.checked)}
          data-testid="gstin-toggle"
        />
        <div className="flex flex-col">
          <span className="font-label-md text-label-md text-primary font-medium">Supply Business Tax Credentials (GSTIN)</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Your GSTIN and registered name are printed on the order&apos;s tax invoice so your business can claim input tax credit.
          </span>
        </div>
      </label>
      {on && (
        <div className="mt-space-md grid grid-cols-1 md:grid-cols-2 gap-space-md" id="gstin-fields">
          <div>
            <label htmlFor="gstin-number" className={consignmentLabel}>
              GST Identification Number
            </label>
            <input
              id="gstin-number"
              className={`${consignmentInput} uppercase`}
              placeholder="06AAAAA0000A1Z5"
              type="text"
              maxLength={15}
              value={gstin}
              onChange={(e) => onGstin(e.target.value.toUpperCase())}
              aria-invalid={!!errors.gstin}
              data-testid="gstin-number-input"
            />
            {errors.gstin && <p className="mt-1 font-label-sm text-label-sm text-error">{errors.gstin}</p>}
          </div>
          <div>
            <label htmlFor="gstin-legal-name" className={consignmentLabel}>
              Corporate Legal Entity
            </label>
            <input
              id="gstin-legal-name"
              className={consignmentInput}
              placeholder="Registered Firm Legal Name"
              type="text"
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

/** The "Order Consignment" summary card and the trust panel below it. */
export function OrderConsignment({
  cart,
  region,
  cta,
  onRemove,
  updating,
}: {
  cart: Cart
  region: CheckoutRegion
  cta: { label: string; onClick: () => void; pending: boolean }
  /** Lets the shopper drop a line from the bag (delivery step). */
  onRemove?: (lineId: string) => void
  /** A delivery choice is being saved, so the fee and total are about to change. */
  updating?: boolean
}) {
  const option = cart.shippingOptions.find((o) => o.id === cart.shippingOptionId) ?? null
  const n = itemCount(cart)
  return (
    <>
      <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-xs">
          <span className="font-headline-sm text-headline-sm text-primary font-medium">Order Consignment</span>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            {n} {n === 1 ? "Curated Piece" : "Curated Pieces"}
          </span>
        </div>
        <ul className="flex flex-col" data-testid="items-table">
          {cart.items.map((item) => (
            <li key={item.id} className="flex items-center gap-space-md py-space-xs" data-testid="product-row">
              <div className="w-16 h-20 bg-surface-container-high rounded overflow-hidden flex-shrink-0 relative">
                {item.thumbnail && <Image src={item.thumbnail} alt={item.productTitle} fill sizes="64px" className="object-cover" />}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className="font-body-md text-body-md text-primary font-medium truncate" data-testid="product-title">
                  {item.productTitle}
                </h3>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {[variantLine(item) && `Size ${variantLine(item)}`, `Qty ${item.quantity}`].filter(Boolean).join(" • ")}
                </span>
                {onRemove && (
                  <button
                    type="button"
                    className="self-start font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-error transition-colors mt-1 disabled:opacity-60"
                    disabled={cta.pending}
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.productTitle} from bag`}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="text-right">
                <span className="font-body-md text-body-md text-primary font-medium tabular-nums">{money(cart, item.total)}</span>
              </div>
            </li>
          ))}
        </ul>

        <PromoField applied={cart.promoCodes} variant="shipping" />

        <div className="flex flex-col gap-space-xs pt-space-xs font-body-sm text-body-sm">
          <div className="flex justify-between items-center text-on-surface-variant">
            <span>Artifacts Subtotal</span>
            <span className="tabular-nums font-medium text-primary">{money(cart, cart.totals.itemSubtotal)}</span>
          </div>
          {cart.totals.discountTotal > 0 && (
            <div className="flex justify-between items-center text-secondary">
              <span>Coupon Discount</span>
              <span className="tabular-nums font-medium">-{money(cart, cart.totals.discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-on-surface-variant gap-space-sm">
            <span className="truncate">{option?.name ?? "Delivery"}</span>
            {updating ? (
              <span className="text-on-surface-variant">Updating…</span>
            ) : option ? (
              <span className="tabular-nums text-primary font-medium">
                {cart.totals.shippingTotal === 0 ? `Waived (${money(cart, 0)})` : money(cart, cart.totals.shippingTotal)}
              </span>
            ) : (
              <span className="text-on-surface-variant">Chosen at next step</span>
            )}
          </div>
          <div className="flex justify-between items-center text-on-surface-variant">
            <span>{taxLabel(region)}</span>
            <span className="tabular-nums font-medium text-primary">{money(cart, cart.totals.taxTotal)}</span>
          </div>
          <div className="pt-space-sm mt-space-xs flex justify-between items-baseline gap-space-sm">
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary font-medium">Total Payable</span>
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">All taxes and duties included</span>
            </div>
            <span className="font-headline-lg text-headline-lg text-primary font-semibold tabular-nums" data-testid="checkout-total">
              {money(cart, cart.totals.total)}
            </span>
          </div>
        </div>

        <button
          className="w-full h-12 bg-primary hover:bg-surface-variant hover:text-on-surface text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded transition-all duration-200 flex items-center justify-center gap-space-xs shadow-md mt-space-xs disabled:opacity-60"
          type="button"
          onClick={cta.onClick}
          disabled={cta.pending || updating}
          data-testid="checkout-continue-button"
        >
          <span>{cta.pending ? "Saving…" : cta.label}</span>
          <MIcon name="arrow_forward" className="text-[18px]" />
        </button>

        <div className="p-space-sm bg-surface-container-low rounded text-center">
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Dispatched in 100% Recyclable FSC-Certified Linen Boxes</span>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
          <MIcon name="encrypted" className="text-primary text-[20px]" />
          <div className="flex flex-col">
            <span className="font-medium text-primary">Cryptographic Tamper-Proof Seals</span>
            <span className="text-on-surface-variant font-label-caps text-label-caps">Inspected by Everwear Quality Lab</span>
          </div>
        </div>
        <div className="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
          <MIcon name="swap_horiz" className="text-primary text-[20px]" />
          <div className="flex flex-col">
            <span className="font-medium text-primary">{returnsLine(region.policies)}</span>
            <span className="text-on-surface-variant font-label-caps text-label-caps">Request a return from your order page</span>
          </div>
        </div>
        <div className="flex items-center gap-space-sm text-on-surface font-body-sm text-body-sm">
          <MIcon name="verified_user" className="text-primary text-[20px]" />
          <div className="flex flex-col">
            <span className="font-medium text-primary">256-Bit SSL Encrypted Banking Vault</span>
            <span className="text-on-surface-variant font-label-caps text-label-caps">PCI-DSS Level 1 Authenticated</span>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Phase 02 of the export: "Delivery Handover Protocol". One card per delivery
 * option (the chosen one expands with its amenity pills), then the courier
 * note. Used by the delivery step and the review step.
 */
export function DeliveryProtocol({
  cart,
  region,
  selectedId,
  onChoose,
  notes,
  onNotes,
  disabled,
  heading = "h2",
}: {
  cart: Cart
  region: CheckoutRegion
  selectedId: string
  onChoose: (id: string) => void
  notes: string
  onNotes: (v: string) => void
  disabled?: boolean
  /** The delivery step has no Phase 01 above it, so this is its page title. */
  heading?: "h1" | "h2"
}) {
  const options = cart.shippingOptions
  const cheapest = Math.min(...options.map((o) => o.amount))
  const Heading = heading
  return (
    <div className={`flex flex-col gap-space-md ${heading === "h2" ? "pt-space-md" : ""}`}>
      <div>
        <span className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant block mb-space-xs">Phase 02 / Transit Logistics</span>
        <Heading className={`${heading === "h1" ? "font-headline-xl text-headline-xl max-md:text-[2rem]" : "font-headline-lg text-headline-lg"} text-primary font-normal`}>
          Delivery Handover Protocol
        </Heading>
      </div>

      <div role="radiogroup" aria-label="Delivery method" className="flex flex-col gap-space-md" data-testid="delivery-options-container">
        {options.map((o: ShippingOption) => {
          const selected = o.id === selectedId
          const standard = o.amount === cheapest
          return (
            <label
              key={o.id}
              className={`p-space-lg rounded-lg shadow-sm flex flex-col gap-space-md transition-colors cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                selected ? "bg-surface-container-lowest" : "bg-surface-container-lowest/60 hover:bg-surface-container-lowest"
              }`}
              data-testid="delivery-option-radio"
            >
              <div className="flex items-start justify-between gap-space-md">
                <div className="flex items-start gap-space-md min-w-0">
                  <input
                    type="radio"
                    className="sr-only"
                    name="shipping_speed"
                    value={o.id}
                    checked={selected}
                    onChange={() => onChoose(o.id)}
                    disabled={disabled}
                  />
                  <span className="mt-1">
                    <CheckRadio checked={selected} />
                  </span>
                  <div className="flex flex-col gap-space-xs min-w-0">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <span className="font-headline-sm text-headline-sm text-primary font-medium">{o.name}</span>
                      {!standard && (
                        <span className="px-space-xs py-0.5 bg-primary-container text-on-primary font-label-caps text-label-caps uppercase rounded-sm">Priority Dispatch</span>
                      )}
                    </div>
                    <span className="font-body-md text-body-md text-primary font-medium">{deliveryEstimateShort(o, options, region.policies)}</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                      {deliveryEstimate(o, options, region.policies)}{" "}
                      {standard ? "Dispatched in our recyclable archival box." : "Handed to the courier ahead of standard parcels."}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-headline-sm text-headline-sm text-primary font-medium">
                    {o.amount === 0 ? (standard ? "Free" : "Complimentary") : money(cart, o.amount)}
                  </span>
                </div>
              </div>
              {selected && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-space-xs">
                  <div className="p-space-sm bg-surface-container-low rounded flex items-center gap-space-xs">
                    <MIcon name="schedule" className="text-[18px] text-primary" />
                    <span className="font-body-sm text-body-sm text-on-surface">{standard ? "Standard handling" : "Priority handling"}</span>
                  </div>
                  <div className="p-space-sm bg-surface-container-low rounded flex items-center gap-space-xs">
                    <MIcon name="shield" className="text-[18px] text-primary" />
                    <span className="font-body-sm text-body-sm text-on-surface">{returnsLine(region.policies)}</span>
                  </div>
                  <div className="p-space-sm bg-surface-container-low rounded flex items-center gap-space-xs">
                    <MIcon name="badge" className="text-[18px] text-primary" />
                    <span className="font-body-sm text-body-sm text-on-surface">Live order tracking</span>
                  </div>
                </div>
              )}
            </label>
          )
        })}
      </div>

      <div className="flex flex-col gap-space-xs pt-space-xs">
        <label className="font-label-caps text-label-caps uppercase text-on-surface-variant flex items-center gap-1" htmlFor="delivery-notes">
          <MIcon name="lock" className="text-[16px]" />
          <span>Gate Passcode &amp; Concierge Handover Instructions</span>
        </label>
        <textarea
          className="w-full p-space-md bg-surface-container-lowest font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none rounded-lg shadow-sm resize-none"
          id="delivery-notes"
          placeholder="e.g. Share the gate code with the courier, or leave with the lobby concierge."
          rows={2}
          maxLength={300}
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          data-testid="delivery-notes-input"
        />
      </div>
    </div>
  )
}
