"use client"

import type { Address, Cart, Customer } from "@lib/api/types"
import { deleteAddress, saveAddress, setDefaultAddress } from "@lib/data/account"
import { setCheckoutAddress } from "@lib/data/shop"
import { buyerGstinSchema, checkoutAddressStepSchema, savedAddressSchema } from "@lib/validation/checkout-schemas"
import { useRouter } from "next/navigation"
import { useLayoutEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  type CheckoutRegion,
  streetLine,
} from "./checkout-data"
import { AddressOrderSummary, AddressSelectionFrame, AddressSelectionTitle, AddressTile, GstinToggle, PackagingNote, tileNote } from "./address-selection"
import { consignmentInput, consignmentLabel, ErrorBanner } from "./consignment"
import { MIcon } from "./m-icon"
import { StoreSelect } from "@/components/store/store-select"

type Country = { code: string; name: string }
type SavedAddress = Address & { id: string }

type FormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address1: string
  postalCode: string
  city: string
  countryCode: string
  sameAsShipping: boolean
}

const sameAddress = (a: Partial<Address> | null | undefined, b: Partial<Address> | null | undefined) =>
  !!a && !!b && a.address1 === b.address1 && a.postalCode === b.postalCode && a.firstName === b.firstName

const errorsFrom = (issues: { path: PropertyKey[]; message: string }[], prefix = "") => {
  const out: Record<string, string> = {}
  for (const issue of issues) {
    const key = prefix + issue.path.map(String).join(".")
    if (!out[key]) out[key] = issue.message
  }
  return out
}

/**
 * Checkout step 1 (address). Styled as Phase 01 of
 * storefront_checkout_shipping_delivery_selection, sharing its cards and
 * summary with the review step (./consignment).
 */
export function AddressStep({
  cart,
  customer,
  countries,
  region,
  countryCode,
  ticker,
}: {
  cart: Cart
  customer: Customer | null
  countries: Country[]
  region: CheckoutRegion
  countryCode: string
  ticker: string
}) {
  const router = useRouter()
  const saved: SavedAddress[] = customer?.addresses ?? []
  const signedIn = !!customer

  const [selectedId, setSelectedId] = useState<string | null>(
    () => saved.find((a) => sameAddress(a, cart.shippingAddress))?.id ?? saved[0]?.id ?? null
  )
  // Signed-in shoppers pick a saved card; the form opens to add or edit one.
  // Guests (and accounts with no saved address) always fill the form.
  const [editing, setEditing] = useState<{ kind: "new" } | { kind: "edit"; id: string } | null>(null)
  const usingForm = !signedIn || saved.length === 0

  const initial = (usingForm ? cart.shippingAddress : null) ?? null
  const blank = (a: Partial<Address> | null): FormState => ({
    firstName: a?.firstName ?? (usingForm ? customer?.firstName ?? "" : ""),
    lastName: a?.lastName ?? (usingForm ? customer?.lastName ?? "" : ""),
    email: cart.email ?? customer?.email ?? "",
    phone: a?.phone ?? (usingForm ? customer?.phone ?? "" : ""),
    address1: a?.address1 ?? "",
    postalCode: a?.postalCode ?? "",
    city: a?.city ?? "",
    countryCode: a?.countryCode ?? countryCode,
    sameAsShipping: true,
  })
  const [form, setForm] = useState<FormState>(() => blank(initial))

  // Text typed before React hydrates lives only in the DOM; the first re-render
  // would wipe it (a shopper on a slow phone starting to type straight away
  // lost the address). Adopt whatever the inputs already hold, once, right
  // after hydration and before anything re-renders.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time adoption of pre-hydration DOM input
    setForm((prev) => {
      let next = prev
      for (const key of Object.keys(prev) as (keyof FormState)[]) {
        if (typeof prev[key] !== "string") continue
        const el = document.getElementById(`checkout-${key}`) as HTMLInputElement | HTMLSelectElement | null
        if (el && el.value && el.value !== prev[key]) next = { ...next, [key]: el.value }
      }
      return next
    })
  }, [])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [gstOn, setGstOn] = useState(!!cart.buyerGstin)
  const [gstin, setGstin] = useState(cart.buyerGstin?.gstin ?? "")
  const [legalName, setLegalName] = useState(cart.buyerGstin?.legalName ?? "")

  const [pending, startTransition] = useTransition()

  const [generalError, setGeneralError] = useState<string | null>(null)

  // After "Store Address" adds a card, select it once the refreshed list arrives.
  const [selectNewest, setSelectNewest] = useState(false)
  const savedCount = saved.length
  const newestId = saved[savedCount - 1]?.id ?? null
  const [prevCount, setPrevCount] = useState(savedCount)
  if (savedCount !== prevCount) {
    setPrevCount(savedCount)
    if (selectNewest && savedCount > prevCount && newestId) {
      setSelectedId(newestId)
      setSelectNewest(false)
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const fail = (message: string) => {
    setGeneralError(message)
    toast.error(message)
  }

  const openNew = () => {
    setErrors({})
    setForm(blank(null))
    setEditing((e) => (e?.kind === "new" ? null : { kind: "new" }))
  }

  const openEdit = (a: SavedAddress) => {
    setErrors({})
    setForm(blank(a))
    setEditing({ kind: "edit", id: a.id })
  }

  /** Adds or updates an address-book entry (signed-in shoppers only). */
  const storeAddress = () => {
    const values = {
      firstName: form.firstName,
      lastName: form.lastName,
      address1: form.address1,
      city: form.city,
      postalCode: form.postalCode,
      countryCode: form.countryCode.toLowerCase(),
      phone: form.phone,
    }
    const parsed = savedAddressSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(errorsFrom(parsed.error.issues, "shipping."))
      return
    }
    setErrors({})
    const data = new FormData()
    for (const [k, v] of Object.entries(values)) data.append(k, v)
    if (editing?.kind === "edit") data.append("addressId", editing.id)
    startTransition(async () => {
      const result = await saveAddress({ error: null }, data)
      if (result.error) {
        if (result.fieldErrors) {
          const mapped: Record<string, string> = {}
          for (const [k, v] of Object.entries(result.fieldErrors)) if (v) mapped[`shipping.${k}`] = v
          setErrors(mapped)
        }
        return fail(result.error)
      }
      toast.success(editing?.kind === "edit" ? "Address updated" : "Address saved to your account")
      if (editing?.kind === "new") setSelectNewest(true)
      setEditing(null)
    })
  }

  const removeAddress = (a: SavedAddress) => {
    if (!window.confirm(`Remove ${streetLine(a)} from your saved addresses?`)) return
    startTransition(async () => {
      try {
        await deleteAddress(a.id)
      } catch {
        return fail("That address couldn't be removed. Please try again.")
      }
      if (selectedId === a.id) setSelectedId(saved.find((x) => x.id !== a.id)?.id ?? null)
      if (editing?.kind === "edit" && editing.id === a.id) setEditing(null)
      toast.success("Address removed")
    })
  }

  const makeDefault = (a: SavedAddress) => {
    startTransition(async () => {
      const result = await setDefaultAddress(a.id)
      if (result.error) return fail(result.error)
      toast.success("Default address updated")
    })
  }

  const continueToDelivery = () => {
    setGeneralError(null)
    let target: Partial<Address>
    let email: string
    if (usingForm) {
      target = {
        firstName: form.firstName,
        lastName: form.lastName,
        address1: form.address1,
        city: form.city,
        postalCode: form.postalCode,
        countryCode: (form.countryCode || countryCode).toLowerCase(),
        phone: form.phone || undefined,
      }
      email = form.email
    } else {
      const chosen = saved.find((a) => a.id === selectedId)
      if (!chosen) return fail("Choose a delivery address, or add a new one.")
      target = chosen
      email = cart.email ?? customer?.email ?? ""
    }

    const check = checkoutAddressStepSchema.safeParse({ email, shipping: target, sameAsShipping: form.sameAsShipping })
    const gst = gstOn ? buyerGstinSchema.safeParse({ gstin, legalName }) : null
    const next: Record<string, string> = {}
    if (!check.success) Object.assign(next, errorsFrom(check.error.issues))
    if (gst && !gst.success) Object.assign(next, errorsFrom(gst.error.issues, "gstin."))
    setErrors(next)
    if (!check.success) {
      if (!usingForm) {
        // A saved address missing something the courier needs: open it to fix.
        const chosen = saved.find((a) => a.id === selectedId)
        if (chosen) openEdit(chosen)
      }
      fail("Please complete the delivery address.")
      document.getElementById("checkout-address")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    if (gst && !gst.success) return fail("Please check the GSTIN details.")

    const data = new FormData()
    data.append("email", email)
    data.append("shipping.firstName", target.firstName ?? "")
    data.append("shipping.lastName", target.lastName ?? "")
    if (target.company) data.append("shipping.company", target.company)
    data.append("shipping.address1", target.address1 ?? "")
    if (target.address2) data.append("shipping.address2", target.address2)
    data.append("shipping.city", target.city ?? "")
    if (target.province) data.append("shipping.province", target.province)
    data.append("shipping.postalCode", target.postalCode ?? "")
    data.append("shipping.countryCode", (target.countryCode ?? countryCode).toLowerCase())
    if (target.phone) data.append("shipping.phone", target.phone)
    if (form.sameAsShipping) data.append("sameAsShipping", "on")
    data.append("gstin.enabled", gstOn ? "on" : "off")
    if (gstOn) {
      data.append("gstin.number", gstin)
      data.append("gstin.legalName", legalName)
    }

    startTransition(async () => {
      const result = await setCheckoutAddress(data)
      if (result.error) return fail(result.error)
      router.push(`/${countryCode}/checkout?step=delivery`)
      window.scrollTo({ top: 0 })
    })
  }

  const field = (
    key: keyof FormState,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> & { "data-testid"?: string },
    errorKey: string,
    span = false
  ) => (
    <div className={span ? "md:col-span-2" : undefined}>
      <label htmlFor={`checkout-${key}`} className={consignmentLabel}>
        {label}
      </label>
      <input
        id={`checkout-${key}`}
        className={consignmentInput}
        value={String(form[key])}
        onChange={(e) => set(key, e.target.value as never)}
        aria-invalid={!!errors[errorKey]}
        aria-describedby={errors[errorKey] ? `checkout-${key}-error` : undefined}
        {...props}
      />
      {errors[errorKey] && (
        <p id={`checkout-${key}-error`} className="mt-1 font-label-sm text-label-sm text-error">
          {errors[errorKey]}
        </p>
      )}
    </div>
  )

  const editingSaved = editing?.kind === "edit" ? saved.find((a) => a.id === editing.id) ?? null : null
  const formTitle = editingSaved ? "Edit Consignment Address" : usingForm ? "Consignment Address" : "Register New Architectural Address"

  const addressForm = (
    <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm flex flex-col gap-space-md" id="new-address-form">
      <div className="flex items-center justify-between gap-space-sm">
        <span className="font-headline-sm text-headline-sm text-primary font-medium">{formTitle}</span>
        {editing && (
          <button className="text-on-surface-variant hover:text-primary" type="button" aria-label="Close address form" onClick={() => setEditing(null)}>
            <MIcon name="close" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {field("firstName", "First Name", { type: "text", autoComplete: "given-name", placeholder: "e.g. Aarav", "data-testid": "shipping-first-name-input" }, "shipping.firstName")}
        {field("lastName", "Last Name", { type: "text", autoComplete: "family-name", placeholder: "e.g. Sharma", "data-testid": "shipping-last-name-input" }, "shipping.lastName")}
        {field("phone", "Phone Number (+91)", { type: "tel", autoComplete: "tel", placeholder: "10-digit mobile number", "data-testid": "shipping-phone-input" }, "shipping.phone")}
        {usingForm &&
          field("email", "Email for Order Updates", { type: "email", autoComplete: "email", placeholder: "you@example.com", "data-testid": "shipping-email-input" }, "email")}
        {field(
          "address1",
          "Address (House, Apartment, Street)",
          { type: "text", autoComplete: "address-line1", placeholder: "Street number and building complex", "data-testid": "shipping-address-input" },
          "shipping.address1",
          true
        )}
        {field("postalCode", "Postal Code (PIN)", { type: "text", inputMode: "numeric", autoComplete: "postal-code", placeholder: "6 digits PIN", "data-testid": "shipping-postal-code-input" }, "shipping.postalCode")}
        {field("city", "City / Region", { type: "text", autoComplete: "address-level2", placeholder: "City or District", "data-testid": "shipping-city-input" }, "shipping.city")}
        <div>
          <label htmlFor="checkout-countryCode" className={consignmentLabel}>
            Country
          </label>
          <StoreSelect
            id="checkout-countryCode"
            className="px-space-md border-transparent bg-surface-container-lowest rounded-sm shadow-inner"
            value={form.countryCode}
            autoComplete="country"
            onValueChange={(v) => set("countryCode", v)}
            data-testid="shipping-country-select"
            options={countries.map((c) => ({ value: c.code, label: c.name }))}
          />
        </div>
        {usingForm && (
          <label className="flex items-center gap-space-sm cursor-pointer select-none font-body-sm text-body-sm text-on-surface-variant md:pt-6">
            <input
              type="checkbox"
              className="w-4 h-4 rounded-sm accent-primary"
              checked={form.sameAsShipping}
              onChange={(e) => set("sameAsShipping", e.target.checked)}
              data-testid="billing-address-checkbox"
            />
            <span>Bill to this address too</span>
          </label>
        )}
      </div>
      {editing && (
        <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
          <div className="flex items-center gap-space-md">
            {editingSaved && saved[0]?.id !== editingSaved.id && (
              <button
                type="button"
                className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-primary"
                disabled={pending}
                onClick={() => makeDefault(editingSaved)}
                data-testid="make-default-address"
              >
                Make Default
              </button>
            )}
            {editingSaved && (
              <button
                type="button"
                className="font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-error"
                disabled={pending}
                onClick={() => removeAddress(editingSaved)}
                data-testid="remove-address"
              >
                Remove
              </button>
            )}
          </div>
          <div className="flex items-center gap-space-sm">
            <button className="h-11 px-space-md bg-surface-container hover:bg-surface-container-high text-primary font-label-caps text-label-caps uppercase rounded-sm" type="button" onClick={() => setEditing(null)}>
              Dismiss
            </button>
            <button
              className="h-11 px-space-lg bg-primary text-on-primary font-label-caps text-label-caps uppercase rounded-sm hover:bg-surface-variant hover:text-on-surface transition-colors disabled:opacity-60"
              type="button"
              disabled={pending}
              onClick={storeAddress}
              data-testid="store-address-button"
            >
              Store Address
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <AddressSelectionFrame
      ticker={ticker}
      aside={<AddressOrderSummary cart={cart} region={region} cta={{ label: "Continue to Delivery", onClick: continueToDelivery, pending }} />}
    >
      <ErrorBanner message={generalError} />
      <AddressSelectionTitle id="checkout-address" onAdd={usingForm ? undefined : openNew} expanded={editing?.kind === "new"} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md" role="radiogroup" aria-label="Delivery address">
        {!usingForm &&
          saved.map((a, i) =>
            editing?.kind === "edit" && editing.id === a.id ? (
              <div key={a.id} className="md:col-span-2">
                {addressForm}
              </div>
            ) : (
              <AddressTile
                key={a.id}
                address={a}
                selected={a.id === selectedId}
                isDefault={i === 0}
                onSelect={() => setSelectedId(a.id)}
                onEdit={() => openEdit(a)}
                onRemove={() => removeAddress(a)}
                disabled={pending}
                note={cart.countryCodes.includes(a.countryCode.toLowerCase()) ? tileNote(region) : "Outside this store's region"}
              />
            )
          )}
        {usingForm && <div className="md:col-span-2">{addressForm}</div>}
        {!usingForm && editing?.kind === "new" && <div className="md:col-span-2">{addressForm}</div>}
      </div>

      <GstinToggle
        on={gstOn}
        onToggle={setGstOn}
        gstin={gstin}
        onGstin={setGstin}
        legalName={legalName}
        onLegalName={setLegalName}
        errors={{ gstin: errors["gstin.gstin"], legalName: errors["gstin.legalName"] }}
      />

      <PackagingNote />
    </AddressSelectionFrame>
  )
}
