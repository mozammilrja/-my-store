"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import type { Cart, Customer, Address } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import {
  setCheckoutAddress,
  setShippingOption,
  placeOrder,
} from "@lib/data/shop"
import {
  checkoutAddressStepSchema,
  upiVerificationSchema,
  cardValidationSchema,
} from "@lib/validation/checkout-schemas"
import { PromoCode } from "@modules/bag/promo-code"

interface Country {
  code: string
  name: string
}

interface SecureCheckoutFlowProps {
  cart: Cart
  customer: Customer | null
  countries: Country[]
}

export function SecureCheckoutFlow({
  cart,
  customer,
  countries,
}: SecureCheckoutFlowProps) {
  const params = useParams<{ countryCode: string }>()
  const searchParams = useSearchParams()
  const countryCode = params.countryCode || "in"

  const requestedStep = searchParams.get("step") || "address"
  const router = useRouter()

  const hasAddress = Boolean(cart.email && cart.shippingAddress)

  /**
   * Sequence rules:
   * 1. Address step (Stage 01)
   * 2. Delivery step (Stage 02)
   * 3. Payment step (Stage 03)
   */
  const hasDelivery = Boolean(hasAddress && cart.shippingOptionId)
  const stage: "address" | "delivery" | "payment" =
    requestedStep === "payment" && hasDelivery
      ? "payment"
      : (requestedStep === "delivery" || requestedStep === "payment") &&
        hasAddress
      ? "delivery"
      : "address"

  // Active payment tab
  const requestedMethod = searchParams.get("method")
  const [activeTab, setActiveTab] = useState<
    "upi" | "card" | "netbanking" | "cod" | "emi"
  >(
    requestedMethod === "upi" ||
      requestedMethod === "card" ||
      requestedMethod === "netbanking"
      ? requestedMethod
      : "cod"
  )

  // Address selection state
  const savedAddresses = customer?.addresses || []
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0)
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(
    savedAddresses.length === 0
  )
  const [showGstin, setShowGstin] = useState<boolean>(false)
  const [gstinNumber, setGstinNumber] = useState<string>("")
  const [gstinEntityName, setGstinEntityName] = useState<string>("")

  // Address Form State
  const initialAddress = cart.shippingAddress || savedAddresses[0] || {}
  const [addressData, setAddressData] = useState({
    firstName: initialAddress.firstName || customer?.firstName || "",
    lastName: initialAddress.lastName || customer?.lastName || "",
    email: cart.email || customer?.email || "",
    phone: initialAddress.phone || customer?.phone || "",
    address1: initialAddress.address1 || "",
    address2: initialAddress.address2 || "",
    city: initialAddress.city || "",
    province: initialAddress.province || "",
    postalCode: initialAddress.postalCode || "",
    countryCode: initialAddress.countryCode || countryCode,
    sameAsShipping: true,
  })
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({})

  // Delivery options state
  const options = cart.shippingOptions
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>(
    cart.shippingOptionId || options[0]?.id || ""
  )

  // UPI state
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay")
  const [upiIdInput, setUpiIdInput] = useState("")
  const [upiError, setUpiError] = useState<string | null>(null)
  const [showDynamicQr, setShowDynamicQr] = useState<boolean>(false)

  // Card state
  const [cardData, setCardData] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardholderName: "",
  })
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({})

  // NetBanking state
  const [selectedBank, setSelectedBank] = useState("HDFC Bank")

  // Submission transitions & states
  const [isSubmitting, startTransition] = useTransition()
  const [generalError, setGeneralError] = useState<string | null>(null)

  const buildAddressForm = (): FormData | null => {
    setAddressErrors({})

    let targetAddr: Partial<Address>
    let targetEmail: string

    if (!showNewAddressForm && savedAddresses.length > 0) {
      targetAddr = savedAddresses[selectedAddressIndex] || savedAddresses[0]!
      targetEmail = cart.email || customer?.email || addressData.email
    } else {
      targetAddr = {
        firstName: addressData.firstName,
        lastName: addressData.lastName,
        address1: addressData.address1,
        address2: addressData.address2 || undefined,
        city: addressData.city,
        province: addressData.province || undefined,
        postalCode: addressData.postalCode,
        countryCode: (addressData.countryCode || countryCode).toLowerCase(),
        phone: addressData.phone || undefined,
      }
      targetEmail = addressData.email
    }

    const validation = checkoutAddressStepSchema.safeParse({
      email: targetEmail,
      shipping: targetAddr,
      sameAsShipping: addressData.sameAsShipping,
      billing: addressData.sameAsShipping ? undefined : targetAddr,
    })

    if (!validation.success) {
      const errMap: Record<string, string> = {}
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join(".")
        if (!errMap[path]) errMap[path] = issue.message
      })
      setAddressErrors(errMap)
      if (!showNewAddressForm && savedAddresses.length > 0) {
        setShowNewAddressForm(true)
      }
      toast.error("Please complete the delivery address.")
      document
        .getElementById("checkout-address")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
      return null
    }

    const formData = new FormData()
    formData.append("email", targetEmail)
    formData.append("shipping.firstName", targetAddr.firstName || "")
    formData.append("shipping.lastName", targetAddr.lastName || "")
    formData.append("shipping.address1", targetAddr.address1 || "")
    if (targetAddr.address2) formData.append("shipping.address2", targetAddr.address2)
    formData.append("shipping.city", targetAddr.city || "")
    if (targetAddr.province) formData.append("shipping.province", targetAddr.province)
    formData.append("shipping.postalCode", targetAddr.postalCode || "")
    formData.append(
      "shipping.countryCode",
      (targetAddr.countryCode || countryCode).toLowerCase()
    )
    if (targetAddr.phone) formData.append("shipping.phone", targetAddr.phone)
    if (addressData.sameAsShipping) formData.append("sameAsShipping", "on")
    return formData
  }

  const handleContinue = () => {
    setGeneralError(null)
    const fail = (message: string) => {
      setGeneralError(message)
      toast.error(message)
    }
    const goTo = (step: "delivery" | "payment") => {
      router.push(`/${countryCode}/checkout?step=${step}`)
      router.refresh()
      window.scrollTo({ top: 0 })
    }

    if (stage === "address") {
      const addressForm = buildAddressForm()
      if (!addressForm) return
      startTransition(async () => {
        const saved = await setCheckoutAddress(addressForm)
        if (saved.error) return fail(saved.error)
        goTo("delivery")
      })
      return
    }

    // DELIVERY step
    if (!selectedDeliveryId) return fail("Please choose a delivery method.")
    startTransition(async () => {
      const shipping = await setShippingOption(selectedDeliveryId)
      if (shipping.error) return fail(shipping.error)
      goTo("payment")
    })
  }

  const handlePlaceOrderSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setGeneralError(null)

    const addressForm = stage === "payment" ? null : buildAddressForm()
    if (stage !== "payment" && !addressForm) return

    if (activeTab === "card" && cardData.cardNumber.trim()) {
      const cardResult = cardValidationSchema.safeParse(cardData)
      if (!cardResult.success) {
        const errMap: Record<string, string> = {}
        cardResult.error.issues.forEach((issue) => {
          const path = issue.path[0] as string
          if (!errMap[path]) errMap[path] = issue.message
        })
        setCardErrors(errMap)
        toast.error("Please review credit / debit card details.")
        return
      }
    }

    setUpiError(null)
    if (activeTab === "upi" && upiIdInput.trim()) {
      const upi = upiVerificationSchema.safeParse({ vpa: upiIdInput })
      if (!upi.success) {
        setUpiError(
          upi.error.issues[0]?.message ||
            "Enter a valid UPI ID, e.g. name@okaxis"
        )
        toast.error("Please check your UPI ID.")
        return
      }
    }

    const orderForm = new FormData()
    orderForm.append("countryCode", countryCode)
    orderForm.append("paymentMethod", activeTab === "cod" ? "cod" : "razorpay")

    const fail = (message: string) => {
      setGeneralError(message)
      toast.error(message)
    }

    startTransition(async () => {
      try {
        if (addressForm) {
          const saved = await setCheckoutAddress(addressForm)
          if (saved.error) return fail(saved.error)
          if (selectedDeliveryId) {
            const shipping = await setShippingOption(selectedDeliveryId)
            if (shipping.error) return fail(shipping.error)
          }
        }

        const result = await placeOrder({ error: null }, orderForm)
        if (result?.error) {
          if (activeTab !== "cod") {
            router.push(
              `/${countryCode}/checkout/payment-failed?method=${activeTab}&reason=${encodeURIComponent(
                result.error
              )}`
            )
            return
          }
          fail(result.error)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        if (!message.includes("NEXT_REDIRECT")) fail(message)
      }
    })
  }

  // Calculate items and totals
  const items = [...cart.items].reverse()
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const selectedOption =
    options.find((o) => o.id === selectedDeliveryId) || options[0]
  const deliveryFee = selectedOption?.amount ?? cart.totals.shippingTotal

  const currency = cart.currency
  const money = (n: number) => formatMoney(n, currency)
  const isFreeDelivery = deliveryFee === 0
  const ship = cart.shippingAddress
  const stepIndex = stage === "address" ? 0 : stage === "delivery" ? 1 : 2

  const PAY_MODES = [
    {
      id: "upi" as const,
      label: "Instant UPI",
      hint: "GPay, PhonePe, QR",
      icon: "qr_code_2",
      badge: "Fast",
    },
    {
      id: "card" as const,
      label: "Cards",
      hint: "Visa, MC, RuPay, Amex",
      icon: "credit_card",
    },
    {
      id: "netbanking" as const,
      label: "Net Banking",
      hint: "All Indian Banks",
      icon: "account_balance",
    },
    {
      id: "cod" as const,
      label: "Pay on Delivery",
      hint: "Cash or UPI at doorstep",
      icon: "payments",
    },
    {
      id: "emi" as const,
      label: "EMI & PayLater",
      hint: "Simpl, Cardless EMI",
      icon: "calendar_month",
    },
  ]

  const destination = (withMethod: boolean) => (
    <div
      className="bg-surface-container-lowest p-5 md:p-6 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-surface-container-high/50"
      data-testid="deliver-to-summary"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface flex-shrink-0 mt-0.5">
          <span aria-hidden className="material-symbols-outlined text-[20px]">
            {withMethod ? "local_shipping" : "location_on"}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-label-caps uppercase text-outline">
              Delivery Address
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container-high font-label-caps text-label-caps text-on-surface">
              Default
            </span>
          </div>
          <h3 className="font-body-md text-body-md font-medium text-on-surface mt-0.5">
            {ship?.firstName} {ship?.lastName}
            {ship?.phone ? (
              <span className="text-outline font-normal"> | {ship.phone}</span>
            ) : null}
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-1">
            {[ship?.address1, ship?.address2, ship?.city, ship?.province]
              .filter(Boolean)
              .join(", ")}
            {ship?.postalCode ? ` — ${ship.postalCode}` : ""}
          </p>
          {withMethod && selectedOption && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[13px] text-on-surface">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden />
                {selectedOption.name}
              </span>
              <span className={isFreeDelivery ? "font-semibold text-emerald-700" : "font-medium"}>
                {isFreeDelivery ? "FREE" : money(deliveryFee)}
              </span>
            </p>
          )}
        </div>
      </div>
      <a
        href={`/${countryCode}/checkout?step=address`}
        className="self-start sm:self-center px-3.5 py-1.5 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm tracking-wide uppercase transition-colors whitespace-nowrap"
      >
        Change
      </a>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-background font-body-md text-on-surface antialiased">
      {/* Promotional Micro-ticker from Stitch design */}
      <section className="w-full bg-surface-container-high py-space-xs px-margin text-center">
        <div className="max-w-[1440px] mx-auto flex items-center justify-center gap-space-sm text-on-surface-variant">
          <span aria-hidden className="material-symbols-outlined text-[15px] text-secondary">
            local_shipping
          </span>
          <p className="font-label-caps text-label-caps uppercase tracking-wider">
            Mid-Season Spring Edit • Complimentary express dispatch • 14-day archival return window
          </p>
        </div>
      </section>

      {/* Checkout Stepper Bar from Stitch design */}
      <section className="w-full py-space-lg">
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-xs font-label-caps text-label-caps tracking-widest uppercase text-on-surface-variant">
              <span>Checkout Sequence</span>
              <span className="text-outline">/</span>
              <span className="text-primary font-medium">Stage 0{stepIndex + 1} of 03</span>
            </div>
            <nav aria-label="Checkout Progress" className="flex items-center gap-space-sm sm:gap-space-md">
              {/* Step 1: Address */}
              <div
                className={`flex items-center gap-space-xs ${
                  stepIndex === 0 ? "text-primary" : stepIndex > 0 ? "text-primary" : "text-on-surface-variant opacity-60"
                }`}
                data-testid="checkout-step-address"
              >
                <span
                  className={`w-6 h-6 rounded-full font-label-caps text-label-caps flex items-center justify-center ${
                    stepIndex >= 0 ? "bg-primary text-on-primary font-medium" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {stepIndex > 0 ? (
                    <span aria-hidden className="material-symbols-outlined text-[14px]">check</span>
                  ) : (
                    "1"
                  )}
                </span>
                <span className={`font-label-caps text-label-caps uppercase tracking-wider ${stepIndex === 0 ? "font-semibold" : ""}`}>
                  Address
                </span>
              </div>
              <span className={`w-8 sm:w-12 h-0.5 ${stepIndex >= 1 ? "bg-primary" : "bg-surface-container-high"}`} />

              {/* Step 2: Delivery */}
              <div
                className={`flex items-center gap-space-xs ${
                  stepIndex === 1 ? "text-primary" : stepIndex > 1 ? "text-primary" : "text-on-surface-variant opacity-60"
                }`}
                data-testid="checkout-step-delivery"
              >
                <span
                  className={`w-6 h-6 rounded-full font-label-caps text-label-caps flex items-center justify-center ${
                    stepIndex >= 1 ? "bg-primary text-on-primary font-medium" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {stepIndex > 1 ? (
                    <span aria-hidden className="material-symbols-outlined text-[14px]">check</span>
                  ) : (
                    "2"
                  )}
                </span>
                <span className={`font-label-caps text-label-caps uppercase tracking-wider ${stepIndex === 1 ? "font-semibold" : ""}`}>
                  Delivery
                </span>
              </div>
              <span className={`w-8 sm:w-12 h-0.5 ${stepIndex >= 2 ? "bg-primary" : "bg-surface-container-high"}`} />

              {/* Step 3: Payment */}
              <div
                className={`flex items-center gap-space-xs ${
                  stepIndex === 2 ? "text-primary font-semibold" : "text-on-surface-variant opacity-60"
                }`}
                data-testid="checkout-step-payment"
              >
                <span
                  className={`w-6 h-6 rounded-full font-label-caps text-label-caps flex items-center justify-center ${
                    stepIndex === 2 ? "bg-primary text-on-primary font-medium" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  3
                </span>
                <span className="font-label-caps text-label-caps uppercase tracking-wider">
                  Payment
                </span>
              </div>
            </nav>
            <div className="hidden lg:flex items-center gap-space-xs text-on-surface-variant">
              <span aria-hidden className="material-symbols-outlined text-[16px]">lock</span>
              <span className="font-label-sm text-label-sm">Encrypted Protocol 256-bit</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Stage: Split Layout */}
      <main className="w-full pb-margin">
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
          {generalError && (
            <div
              className="mb-6 flex items-center gap-3 rounded-lg border border-error/30 bg-error-container p-4 text-[14px] text-on-error-container"
              role="alert"
              data-testid="checkout-error"
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">error</span>
              <span>{generalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            {/* Left Column (7 cols on lg, 8 on xl): Stage Content */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-space-lg">
              {/* STAGE 01: ADDRESS SELECTION */}
              {stage === "address" && (
                <section data-testid="address-step" className="flex flex-col gap-space-lg">
                  {/* Section Title & Action */}
                  <div id="checkout-address" className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                    <div>
                      <div className="flex items-center gap-space-xs text-on-surface-variant mb-1">
                        <span aria-hidden className="material-symbols-outlined text-[18px]">location_on</span>
                        <span className="font-label-caps text-label-caps uppercase tracking-widest">Destination Point</span>
                      </div>
                      <h1 className="font-headline-lg text-headline-lg text-on-surface">Select Delivery Address</h1>
                    </div>
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm((prev) => !prev)}
                        className="inline-flex items-center gap-space-xs px-space-md py-space-sm bg-surface-container-low text-primary font-label-md text-label-md rounded-lg shadow-sm hover:bg-surface-container transition-colors self-start sm:self-auto cursor-pointer"
                      >
                        <span aria-hidden className="material-symbols-outlined text-[18px]">
                          {showNewAddressForm ? "bookmark" : "add"}
                        </span>
                        <span>{showNewAddressForm ? "Use Saved Address" : "Add New Address"}</span>
                      </button>
                    )}
                  </div>

                  {/* Address Cards Grid */}
                  {!showNewAddressForm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md" role="radiogroup" aria-label="Saved addresses">
                      {savedAddresses.map((addr, index) => {
                        const isSelected = selectedAddressIndex === index
                        return (
                          <label
                            key={addr.id ?? index}
                            onClick={() => setSelectedAddressIndex(index)}
                            className={`relative flex flex-col justify-between p-space-md rounded-lg shadow-md cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? "bg-surface-container-lowest outline-2 outline-primary"
                                : "bg-surface-container-low hover:bg-surface-container-lowest"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-space-sm">
                                <div className="flex items-center gap-space-sm">
                                  <input
                                    type="radio"
                                    name="shipping_address_choice"
                                    checked={isSelected}
                                    onChange={() => setSelectedAddressIndex(index)}
                                    className="w-4 h-4 accent-primary text-primary focus:ring-0 cursor-pointer"
                                  />
                                  <span className="font-headline-sm text-headline-sm text-on-surface font-medium">
                                    {[addr.firstName, addr.lastName].filter(Boolean).join(" ") ||
                                      [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
                                      "Client"}
                                  </span>
                                </div>
                                <span className="px-space-xs py-0.5 bg-surface-container-high text-on-surface font-label-caps text-label-caps rounded uppercase">
                                  {index === 0 ? "PRIMARY HOME" : addr.company || "STUDIO ATELIER"}
                                </span>
                              </div>
                              <p className="font-body-md text-body-md text-on-surface-variant mb-space-xs">
                                {[addr.address1, addr.address2].filter(Boolean).join(", ")}
                              </p>
                              <p className="font-body-sm text-body-sm text-on-surface-variant">
                                {[addr.city, addr.province].filter(Boolean).join(", ")}
                                {addr.postalCode ? ` — ${addr.postalCode}` : ""}
                              </p>
                              {addr.phone && (
                                <div className="mt-space-sm flex items-center gap-space-xs text-on-surface font-body-sm text-body-sm">
                                  <span aria-hidden className="material-symbols-outlined text-[15px] text-outline">call</span>
                                  <span>{addr.phone}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-space-md pt-space-sm flex items-center justify-between bg-surface-container-low px-space-sm py-space-xs rounded">
                              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                                Standard: 3-5 Working Days
                              </span>
                              <div className="flex items-center gap-space-sm">
                                <a
                                  href={`/${countryCode}/account/addresses`}
                                  className="font-label-caps text-label-caps text-primary hover:text-secondary uppercase"
                                >
                                  Edit
                                </a>
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {/* Expandable New Address Panel */}
                  {showNewAddressForm && (
                    <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-sm border border-surface-container-high/60" id="new-address-form">
                      <div className="flex items-center justify-between mb-space-md">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-medium">
                          Enter Custom Archival Delivery Point
                        </span>
                        {savedAddresses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowNewAddressForm(false)}
                            className="text-on-surface-variant hover:text-primary cursor-pointer"
                          >
                            <span aria-hidden className="material-symbols-outlined">close</span>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                        <div>
                          <label className="block font-label-caps text-label-caps text-on-surface uppercase mb-1">First Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Mozammil"
                            value={addressData.firstName}
                            onChange={(e) => setAddressData({ ...addressData, firstName: e.target.value })}
                            className="w-full h-11 px-space-md bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded focus:bg-surface-container-lowest focus:outline-none border border-surface-container-high/60 focus:border-primary"
                            data-testid="shipping-first-name-input"
                          />
                          {addressErrors["shipping.firstName"] && (
                            <p className="text-xs text-error mt-1">{addressErrors["shipping.firstName"]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-label-caps text-label-caps text-on-surface uppercase mb-1">Last Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Raja"
                            value={addressData.lastName}
                            onChange={(e) => setAddressData({ ...addressData, lastName: e.target.value })}
                            className="w-full h-11 px-space-md bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded focus:bg-surface-container-lowest focus:outline-none border border-surface-container-high/60 focus:border-primary"
                            data-testid="shipping-last-name-input"
                          />
                          {addressErrors["shipping.lastName"] && (
                            <p className="text-xs text-error mt-1">{addressErrors["shipping.lastName"]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-label-caps text-label-caps text-on-surface uppercase mb-1">Phone Number (+91)</label>
                          <input
                            type="tel"
                            placeholder="10-digit mobile number"
                            value={addressData.phone}
                            onChange={(e) => setAddressData({ ...addressData, phone: e.target.value })}
                            className="w-full h-11 px-space-md bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded focus:bg-surface-container-lowest focus:outline-none border border-surface-container-high/60 focus:border-primary"
                          />
                          {addressErrors["shipping.phone"] && (
                            <p className="text-xs text-error mt-1">{addressErrors["shipping.phone"]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-label-caps text-label-caps text-on-surface uppercase mb-1">Email for Dispatch Updates</label>
                          <input
                            type="email"
                            placeholder="client@atelier.com"
                            value={addressData.email}
                            onChange={(e) => setAddressData({ ...addressData, email: e.target.value })}
                            className="w-full h-11 px-space-md bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded focus:bg-surface-container-lowest focus:outline-none border border-surface-container-high/60 focus:border-primary"
                            data-testid="shipping-email-input"
                          />
                          {addressErrors["email"] && (
                            <p className="text-xs text-error mt-1">{addressErrors["email"]}</p>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block font-label-caps text-label-caps text-on-surface uppercase mb-1">Address Line 1 (House, Apartment, Suite)</label>
                          <input
                            type="text"
                            placeholder="Street number and building complex"
                            value={addressData.address1}
                            onChange={(e) => setAddressData({ ...addressData, address1: e.target.value })}
                            className="w-full h-11 px-space-md bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded focus:bg-surface-container-lowest focus:outline-none border border-surface-container-high/60 focus:border-primary"
                            data-testid="shipping-address-input"
                          />
                          {addressErrors["shipping.address1"] && (
                            <p className="text-xs text-error mt-1">{addressErrors["shipping.address1"]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-label-caps text-label-caps text-on-surface uppercase mb-1">Postal Code (PIN)</label>
                          <input
                            type="text"
                            placeholder="6 digits PIN"
                            value={addressData.postalCode}
                            onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                            className="w-full h-11 px-space-md bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded focus:bg-surface-container-lowest focus:outline-none border border-surface-container-high/60 focus:border-primary"
                            data-testid="shipping-postal-code-input"
                          />
                          {addressErrors["shipping.postalCode"] && (
                            <p className="text-xs text-error mt-1">{addressErrors["shipping.postalCode"]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-label-caps text-label-caps text-on-surface uppercase mb-1">City / Region</label>
                          <input
                            type="text"
                            placeholder="City or District"
                            value={addressData.city}
                            onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                            className="w-full h-11 px-space-md bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded focus:bg-surface-container-lowest focus:outline-none border border-surface-container-high/60 focus:border-primary"
                            data-testid="shipping-city-input"
                          />
                          {addressErrors["shipping.city"] && (
                            <p className="text-xs text-error mt-1">{addressErrors["shipping.city"]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block font-label-caps text-label-caps text-on-surface uppercase mb-1">Country</label>
                          <select
                            value={addressData.countryCode}
                            onChange={(e) => setAddressData({ ...addressData, countryCode: e.target.value })}
                            className="w-full h-11 px-space-md bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded focus:bg-surface-container-lowest focus:outline-none border border-surface-container-high/60 focus:border-primary"
                            data-testid="shipping-country-select"
                          >
                            {countries.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 text-xs font-body-sm text-on-surface-variant cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={addressData.sameAsShipping}
                              onChange={(e) => setAddressData({ ...addressData, sameAsShipping: e.target.checked })}
                              className="accent-primary"
                              data-testid="billing-address-checkbox"
                            />
                            <span>Billing address matches shipping address</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Business Billing GSTIN Box */}
                  <div className="p-space-md bg-surface-container-low rounded-lg shadow-sm">
                    <label className="flex items-center gap-space-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showGstin}
                        onChange={(e) => setShowGstin(e.target.checked)}
                        className="w-4 h-4 accent-primary text-primary focus:ring-0 cursor-pointer"
                      />
                      <span className="font-body-md text-body-md text-on-surface font-medium">
                        Use GSTIN for commercial tax invoice (Optional)
                      </span>
                    </label>
                    {showGstin && (
                      <div className="mt-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                        <div>
                          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">GSTIN Number</label>
                          <input
                            type="text"
                            placeholder="22AAAAA0000A1Z5"
                            value={gstinNumber}
                            onChange={(e) => setGstinNumber(e.target.value)}
                            className="w-full h-11 px-space-md bg-surface-container-lowest text-on-surface font-body-sm text-body-sm rounded uppercase focus:outline-none border border-surface-container-high/60"
                          />
                        </div>
                        <div>
                          <label className="block font-label-caps text-label-caps text-on-surface-variant uppercase mb-1">Registered Entity Name</label>
                          <input
                            type="text"
                            placeholder="Legal registered trade name"
                            value={gstinEntityName}
                            onChange={(e) => setGstinEntityName(e.target.value)}
                            className="w-full h-11 px-space-md bg-surface-container-lowest text-on-surface font-body-sm text-body-sm rounded focus:outline-none border border-surface-container-high/60"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dispatch Assurance Card */}
                  <div className="p-space-md bg-surface-container-lowest rounded-lg shadow-sm flex items-center justify-between gap-space-md border border-surface-container-high/40">
                    <div className="flex items-center gap-space-md">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                        <span aria-hidden className="material-symbols-outlined text-[20px]">inventory_2</span>
                      </div>
                      <div>
                        <h2 className="font-label-md text-label-md text-on-surface font-semibold">Climate-Calibrated Packaging</h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Garments are layered in unbleached organic linen slips with cedarwood tags.
                        </p>
                      </div>
                    </div>
                    <span className="hidden md:inline-block font-label-caps text-label-caps text-secondary font-bold uppercase tracking-wider">
                      CERTIFIED
                    </span>
                  </div>
                </section>
              )}

              {/* STAGE 02: DELIVERY SPEED SELECTION */}
              {stage === "delivery" && (
                <>
                  {destination(false)}
                  <section className="bg-surface-container-lowest p-6 md:p-8 rounded-lg shadow-sm border border-surface-container-high/40" data-testid="delivery-step">
                    <div className="mb-6">
                      <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary">Step 02 / 03</span>
                      <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">Choose Delivery Speed</h1>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        Select how quickly and in what presentation style you wish your curated pieces to arrive.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3.5" role="radiogroup" aria-label="Delivery speed" data-testid="delivery-options-container">
                      {options.map((opt, i) => {
                        const isSelected = selectedDeliveryId === opt.id
                        const free = opt.amount === 0
                        return (
                          <label
                            key={opt.id}
                            onClick={() => setSelectedDeliveryId(opt.id)}
                            className={`delivery-option group relative flex flex-col p-4 md:p-5 rounded-lg cursor-pointer transition-all duration-200 border ${
                              isSelected
                                ? "bg-surface-container-low border-primary/40 shadow-xs"
                                : "bg-surface-container-lowest hover:bg-surface-container-low border-surface-container-high/60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3.5">
                                <input
                                  type="radio"
                                  name="delivery_method"
                                  checked={isSelected}
                                  onChange={() => setSelectedDeliveryId(opt.id)}
                                  className="mt-1 w-4 h-4 text-primary bg-surface-container-lowest focus:ring-0 focus:outline-none accent-primary cursor-pointer"
                                  data-testid="delivery-option-radio"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-body-md text-body-md font-medium text-on-surface">
                                      {opt.name}
                                    </span>
                                    <span
                                      className={`font-label-caps text-label-caps px-2 py-0.5 rounded uppercase font-semibold ${
                                        free
                                          ? "bg-surface-container text-on-surface-variant"
                                          : i === 1
                                          ? "bg-tertiary-fixed text-on-tertiary-fixed"
                                          : "bg-secondary text-on-secondary"
                                      }`}
                                    >
                                      {free ? "Complimentary" : "Fast Track"}
                                    </span>
                                  </div>
                                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                                    {free
                                      ? "Estimated arrival in 3–5 business days via Blue Dart Express tracked logistics."
                                      : "Guaranteed 24–48 hour direct dispatch in major Tier 1 metros with prioritized air routing."}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2.5 font-label-sm text-label-sm text-outline">
                                    <span className="inline-flex items-center gap-1">
                                      <span aria-hidden className="material-symbols-outlined text-[16px] text-primary">eco</span>
                                      Recyclable archival box
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <span aria-hidden className="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
                                      Real-time tracking
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className={`font-label-sm text-label-sm font-semibold uppercase tracking-wider ${free ? "text-primary" : "text-on-surface font-body-md"}`}>
                                  {free ? "FREE" : money(opt.amount)}
                                </span>
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </section>
                </>
              )}

              {/* STAGE 03: PAYMENT SETTLEMENT ENGINE */}
              {stage === "payment" && (
                <>
                  {destination(true)}
                  <section className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm border border-surface-container-high/40" data-testid="review-step">
                    {/* Section Title Header */}
                    <div className="px-6 py-5 bg-surface-container-low flex items-center justify-between border-b border-surface-container-high/60">
                      <div className="flex items-center gap-2.5">
                        <span aria-hidden className="material-symbols-outlined text-[22px] text-on-surface">verified_user</span>
                        <h2 className="font-headline-sm text-headline-sm uppercase tracking-wide text-on-surface">Select Payment Method</h2>
                      </div>
                      <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                        <span aria-hidden className="material-symbols-outlined text-[16px] text-emerald-600">lock</span>
                        <span>100% End-to-End Encrypted</span>
                      </div>
                    </div>

                    {/* Split Tabs UI: Left Tabs + Right Panel */}
                    <div className="flex flex-col md:flex-row">
                      {/* Left Navigation Tab Column */}
                      <div
                        role="tablist"
                        aria-orientation="vertical"
                        className="w-full md:w-64 bg-surface-container-lowest shrink-0 flex md:flex-col overflow-x-auto md:overflow-visible border-r border-surface-container-high/40"
                      >
                        {PAY_MODES.map((mode) => {
                          const isSelected = activeTab === mode.id
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              role="tab"
                              aria-selected={isSelected}
                              onClick={() => setActiveTab(mode.id)}
                              className={`payment-tab group w-full text-left p-4.5 sm:p-5 flex items-center justify-between transition-all relative cursor-pointer ${
                                isSelected
                                  ? "bg-surface-container-low text-primary"
                                  : "text-on-surface-variant hover:bg-surface-container-low/60"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-on-surface group-hover:scale-105 transition-transform">
                                  <span aria-hidden className="material-symbols-outlined text-[20px]">{mode.icon}</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-body-md text-body-md font-medium text-on-surface">{mode.label}</span>
                                    {"badge" in mode && (
                                      <span className="font-label-caps text-[9px] bg-primary text-on-primary px-1.5 py-0.5 rounded uppercase font-semibold">
                                        {mode.badge}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">{mode.hint}</span>
                                </div>
                              </div>
                              <div
                                className={`hidden md:block w-1.5 h-6 rounded-full ${
                                  isSelected ? "bg-primary" : "bg-transparent"
                                }`}
                              />
                            </button>
                          )
                        })}
                      </div>

                      {/* Right Panel Content Area */}
                      <div role="tabpanel" className="flex-1 p-6 md:p-8 bg-surface-container-lowest">
                        <input
                          type="hidden"
                          name="paymentMethod"
                          value={activeTab === "cod" ? "cod" : "razorpay"}
                          data-testid={activeTab === "cod" ? "payment-method-cod" : "payment-method-online"}
                        />

                        {/* Pane: Instant UPI */}
                        {activeTab === "upi" && (
                          <div className="flex flex-col gap-6" id="pane-upi">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-container-high/40">
                              <div>
                                <h3 className="font-headline-sm text-headline-sm text-on-surface">Unified Payments Interface (UPI)</h3>
                                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Pay seamlessly with zero payment surcharge</p>
                              </div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                                <span aria-hidden className="material-symbols-outlined text-[14px] text-emerald-600">bolt</span>
                                Instant Confirmation
                              </span>
                            </div>

                            {/* Popular UPI Apps */}
                            <div>
                              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block mb-3">
                                Popular UPI Applications
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                  { id: "gpay", name: "Google Pay", label1: "G", label2: "P" },
                                  { id: "phonepe", name: "PhonePe", label1: "Pe" },
                                  { id: "paytm", name: "Paytm", label1: "Paytm" },
                                  { id: "cred", name: "CRED Pay", icon: "shield" },
                                ].map((app) => (
                                  <label
                                    key={app.id}
                                    onClick={() => setSelectedUpiApp(app.id)}
                                    className={`cursor-pointer p-3 rounded flex flex-col items-center justify-center text-center gap-2 group transition-colors border ${
                                      selectedUpiApp === app.id
                                        ? "bg-surface-container border-primary/40 shadow-xs"
                                        : "bg-surface-container-low border-transparent hover:bg-surface-container"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name="upi_app"
                                      checked={selectedUpiApp === app.id}
                                      onChange={() => setSelectedUpiApp(app.id)}
                                      className="sr-only"
                                    />
                                    <div className="w-10 h-10 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center font-bold text-sm">
                                      {app.icon ? (
                                        <span aria-hidden className="material-symbols-outlined text-[20px] text-primary">{app.icon}</span>
                                      ) : (
                                        <>
                                          <span className="text-primary font-headline-sm">{app.label1}</span>
                                          {app.label2 && <span className="text-secondary font-headline-sm">{app.label2}</span>}
                                        </>
                                      )}
                                    </div>
                                    <span className="font-label-sm text-label-sm text-on-surface font-medium">{app.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* OR Divider */}
                            <div className="relative flex items-center justify-center">
                              <div className="w-full h-[1px] bg-surface-container" />
                              <span className="absolute bg-surface-container-lowest px-4 font-label-caps text-label-caps uppercase text-outline">
                                or enter UPI ID / VPA
                              </span>
                            </div>

                            {/* UPI ID Field */}
                            <div className="flex flex-col gap-2">
                              <label className="font-label-sm text-label-sm text-on-surface font-medium" htmlFor="upi-id-input">
                                Virtual Payment Address (VPA)
                              </label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <input
                                    id="upi-id-input"
                                    type="text"
                                    placeholder="username@okhdfcbank"
                                    value={upiIdInput}
                                    onChange={(e) => {
                                      setUpiIdInput(e.target.value)
                                      setUpiError(null)
                                    }}
                                    className={`w-full h-11 px-3.5 bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest rounded transition-colors border ${
                                      upiError ? "border-error" : "border-surface-container-high/60"
                                    }`}
                                  />
                                  {upiIdInput && !upiError && (
                                    <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-emerald-600">
                                      verified
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (upiIdInput.includes("@")) toast.success("UPI ID verified successfully")
                                    else toast.error("Please enter a valid handle e.g. name@okaxis")
                                  }}
                                  className="h-11 px-5 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-caps text-label-caps uppercase transition-colors rounded cursor-pointer"
                                >
                                  Verify
                                </button>
                              </div>
                              {upiError && <p className="text-xs text-error mt-0.5">{upiError}</p>}
                              <div className="flex flex-wrap gap-2 mt-1">
                                {["@okaxis", "@oksbi", "@paytm", "@ybl"].map((suffix) => (
                                  <span
                                    key={suffix}
                                    onClick={() => setUpiIdInput((prev) => (prev.includes("@") ? prev.split("@")[0] + suffix : prev + suffix))}
                                    className="cursor-pointer font-label-sm text-xs bg-surface-container px-2 py-0.5 rounded text-on-surface-variant hover:text-primary transition-colors"
                                  >
                                    {suffix}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Dynamic QR Display Toggle Option */}
                            <div className="p-4 bg-surface-container-low rounded-lg flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-surface-container-lowest rounded p-1.5 flex items-center justify-center shadow-xs">
                                  <svg className="w-full h-full text-primary" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4 0h2v4h-2v-4zm4 4h4v4h-4v-4zm-4 2h2v2h-2v-2zm-2-6h2v2h-2v-2z" />
                                  </svg>
                                </div>
                                <div>
                                  <span className="font-body-md text-body-md font-medium text-on-surface block">Dynamic QR Code</span>
                                  <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                                    Scan &amp; Authorize on any mobile banking app
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowDynamicQr((prev) => !prev)}
                                className="h-9 px-3.5 bg-surface-container-lowest hover:bg-surface text-on-surface font-label-caps text-label-caps uppercase rounded transition-colors shadow-xs cursor-pointer"
                              >
                                {showDynamicQr ? "Hide QR" : "Generate QR"}
                              </button>
                            </div>

                            {showDynamicQr && (
                              <div className="flex flex-col items-center justify-center p-6 bg-surface-container-low rounded-lg text-center animate-in fade-in duration-200">
                                <div className="p-3 bg-white rounded-lg shadow-sm">
                                  <svg className="w-36 h-36 text-primary" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v2h-4v-2zm-4 0h2v4h-2v-4zm4 4h4v4h-4v-4zm-4 2h2v2h-2v-2zm-2-6h2v2h-2v-2z" />
                                  </svg>
                                </div>
                                <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface mt-3">
                                  Scan to pay {money(cart.totals.total)}
                                </span>
                              </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={handlePlaceOrderSubmit}
                                disabled={isSubmitting}
                                className="w-full h-12 bg-primary hover:bg-primary/90 text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70"
                                data-testid="submit-order-button"
                              >
                                <span>{isSubmitting ? "Initiating UPI Gateway…" : `Pay ${money(cart.totals.total)} via UPI`}</span>
                                {!isSubmitting && <span aria-hidden className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                              </button>
                              <p className="text-center font-label-sm text-label-sm text-on-surface-variant mt-2">
                                An authorization prompt will be dispatched to your selected UPI app
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Pane: Cards */}
                        {activeTab === "card" && (
                          <div className="flex flex-col gap-5" id="pane-card">
                            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/40">
                              <div>
                                <h3 className="font-headline-sm text-headline-sm text-on-surface">Credit / Debit Card</h3>
                                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">RBI Compliant Tokenization Guaranteed</p>
                              </div>
                              <div className="flex items-center gap-1.5 text-on-surface-variant">
                                <span className="font-label-caps text-[10px] bg-surface-container px-1.5 py-0.5 rounded font-bold">VISA</span>
                                <span className="font-label-caps text-[10px] bg-surface-container px-1.5 py-0.5 rounded font-bold">MC</span>
                                <span className="font-label-caps text-[10px] bg-surface-container px-1.5 py-0.5 rounded font-bold">RUPAY</span>
                                <span className="font-label-caps text-[10px] bg-surface-container px-1.5 py-0.5 rounded font-bold">AMEX</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-4">
                              <div>
                                <label className="font-label-sm text-label-sm text-on-surface font-medium block mb-1.5">Card Number</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="4532 •••• •••• 8920"
                                    maxLength={19}
                                    value={cardData.cardNumber}
                                    onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
                                    className="w-full h-11 px-3.5 bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest rounded transition-colors font-mono border border-surface-container-high/60"
                                  />
                                  <span aria-hidden className="material-symbols-outlined text-outline text-[20px] absolute right-3 top-1/2 -translate-y-1/2">
                                    credit_card
                                  </span>
                                </div>
                                {cardErrors.cardNumber && <p className="text-xs text-error mt-1">{cardErrors.cardNumber}</p>}
                              </div>

                              <div>
                                <label className="font-label-sm text-label-sm text-on-surface font-medium block mb-1.5">Cardholder Name</label>
                                <input
                                  type="text"
                                  placeholder="NAME ON CARD"
                                  value={cardData.cardholderName}
                                  onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
                                  className="w-full h-11 px-3.5 bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest rounded uppercase transition-colors border border-surface-container-high/60"
                                />
                                {cardErrors.cardholderName && <p className="text-xs text-error mt-1">{cardErrors.cardholderName}</p>}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="font-label-sm text-label-sm text-on-surface font-medium block mb-1.5">Valid Thru (MM / YY)</label>
                                  <input
                                    type="text"
                                    placeholder="08 / 28"
                                    maxLength={5}
                                    value={cardData.expiry}
                                    onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                                    className="w-full h-11 px-3.5 bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest rounded transition-colors text-center font-mono border border-surface-container-high/60"
                                  />
                                  {cardErrors.expiry && <p className="text-xs text-error mt-1">{cardErrors.expiry}</p>}
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="font-label-sm text-label-sm text-on-surface font-medium">CVV / CVC</label>
                                    <span aria-hidden className="material-symbols-outlined text-[16px] text-outline cursor-pointer" title="3 digits on back of card">
                                      help
                                    </span>
                                  </div>
                                  <input
                                    type="password"
                                    maxLength={4}
                                    placeholder="•••"
                                    value={cardData.cvv}
                                    onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                                    className="w-full h-11 px-3.5 bg-surface-container-low font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest rounded transition-colors text-center font-mono tracking-widest border border-surface-container-high/60"
                                  />
                                  {cardErrors.cvv && <p className="text-xs text-error mt-1">{cardErrors.cvv}</p>}
                                </div>
                              </div>

                              <label className="flex items-start gap-2.5 cursor-pointer mt-1">
                                <input defaultChecked className="mt-1 w-4 h-4 rounded text-primary accent-primary" type="checkbox" />
                                <span className="font-body-sm text-body-sm text-on-surface-variant">
                                  Securely tokenize and save this card per latest RBI guidelines. We never save raw CVV data.
                                </span>
                              </label>

                              <button
                                type="button"
                                onClick={handlePlaceOrderSubmit}
                                disabled={isSubmitting}
                                className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70"
                                data-testid="submit-order-button"
                              >
                                <span>{isSubmitting ? "Connecting to 3D Secure…" : `Pay ${money(cart.totals.total)}`}</span>
                                {!isSubmitting && <span aria-hidden className="material-symbols-outlined text-[18px]">lock</span>}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Pane: Net Banking */}
                        {activeTab === "netbanking" && (
                          <div className="flex flex-col gap-5" id="pane-netbanking">
                            <div>
                              <h3 className="font-headline-sm text-headline-sm text-on-surface">Net Banking</h3>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                                Direct redirection to your accredited banking portal
                              </p>
                            </div>

                            <div>
                              <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block mb-3">
                                Popular Banks
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                  { code: "HDFC", name: "HDFC Bank" },
                                  { code: "ICICI", name: "ICICI Bank" },
                                  { code: "SBI", name: "State Bank" },
                                  { code: "AXIS", name: "Axis Bank" },
                                  { code: "KOTAK", name: "Kotak Bank" },
                                  { code: "IDFC", name: "IDFC First" },
                                ].map((bank) => (
                                  <button
                                    key={bank.name}
                                    type="button"
                                    onClick={() => setSelectedBank(bank.name)}
                                    className={`p-3 rounded text-left flex items-center gap-3 transition-colors border cursor-pointer ${
                                      selectedBank === bank.name
                                        ? "bg-surface-container border-primary/40 shadow-xs"
                                        : "bg-surface-container-low border-transparent hover:bg-surface-container"
                                    }`}
                                  >
                                    <span className="w-8 h-8 rounded bg-surface-container-lowest flex items-center justify-center font-bold text-xs text-primary">
                                      {bank.code}
                                    </span>
                                    <span className="font-label-sm text-label-sm text-on-surface font-medium">{bank.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="font-label-sm text-label-sm text-on-surface font-medium block mb-1.5">
                                Select Another Institution
                              </label>
                              <select
                                value={selectedBank}
                                onChange={(e) => setSelectedBank(e.target.value)}
                                className="w-full h-11 px-3.5 bg-surface-container-low font-body-sm text-body-sm text-on-surface rounded focus:outline-none focus:bg-surface-container-lowest border border-surface-container-high/60"
                              >
                                <option>Choose from 50+ other Indian scheduled banks...</option>
                                <option>Bank of Baroda</option>
                                <option>Punjab National Bank</option>
                                <option>IndusInd Bank</option>
                                <option>Yes Bank</option>
                                <option>Federal Bank</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={handlePlaceOrderSubmit}
                              disabled={isSubmitting}
                              className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70"
                              data-testid="submit-order-button"
                            >
                              <span>{isSubmitting ? "Transferring…" : `Proceed to Secure Gateway (${money(cart.totals.total)})`}</span>
                              {!isSubmitting && <span aria-hidden className="material-symbols-outlined text-[18px]">open_in_new</span>}
                            </button>
                          </div>
                        )}

                        {/* Pane: Pay on Delivery */}
                        {activeTab === "cod" && (
                          <div className="flex flex-col gap-5" id="pane-cod">
                            <div>
                              <h3 className="font-headline-sm text-headline-sm text-on-surface">Pay on Delivery</h3>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                                Settle with physical currency or instant QR scan upon courier handover
                              </p>
                            </div>

                            <div className="p-4 bg-surface-container-low rounded-lg flex items-start gap-3">
                              <span aria-hidden className="material-symbols-outlined text-[20px] text-on-surface mt-0.5">info</span>
                              <div className="font-body-sm text-body-sm text-on-surface-variant space-y-1">
                                <p>You can pay via cash or by scanning the courier&apos;s UPI QR code directly on consignment delivery.</p>
                                <p className="text-xs text-outline">To curtail logistics wastage, please ensure you are available at the destination.</p>
                              </div>
                            </div>

                            <div className="p-4 rounded-lg bg-surface-container flex flex-col gap-1.5">
                              <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold">
                                Dispatch Verification
                              </span>
                              <p className="font-body-sm text-body-sm text-on-surface-variant">
                                We will dispatch an SMS verification link prior to courier transit.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handlePlaceOrderSubmit}
                              disabled={isSubmitting}
                              className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70"
                              data-testid="submit-order-button"
                            >
                              <span>{isSubmitting ? "Placing Order…" : `Place Order (${money(cart.totals.total)})`}</span>
                              {!isSubmitting && <span aria-hidden className="material-symbols-outlined text-[18px]">check_circle</span>}
                            </button>
                          </div>
                        )}

                        {/* Pane: EMI & Pay Later */}
                        {activeTab === "emi" && (
                          <div className="flex flex-col gap-5" id="pane-emi">
                            <div>
                              <h3 className="font-headline-sm text-headline-sm text-on-surface">EMI &amp; Pay Later Services</h3>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                                Split payments into frictionless monthly installments
                              </p>
                            </div>

                            <div className="space-y-3">
                              <label className="p-4 bg-surface-container-low hover:bg-surface-container rounded-lg flex items-center justify-between cursor-pointer transition-colors block border border-surface-container-high/40">
                                <div className="flex items-center gap-3">
                                  <input defaultChecked className="accent-primary" name="paylater_option" type="radio" />
                                  <div>
                                    <span className="font-body-md text-body-md font-medium text-on-surface block">Simpl 1-Click PayLater</span>
                                    <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                                      Pay in 3 parts with 0% interest surcharge
                                    </span>
                                  </div>
                                </div>
                                <span className="font-label-caps text-label-caps text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                                  Eligible
                                </span>
                              </label>

                              <label className="p-4 bg-surface-container-low hover:bg-surface-container rounded-lg flex items-center justify-between cursor-pointer transition-colors block border border-surface-container-high/40">
                                <div className="flex items-center gap-3">
                                  <input className="accent-primary" name="paylater_option" type="radio" />
                                  <div>
                                    <span className="font-body-md text-body-md font-medium text-on-surface block">Credit Card No-Cost EMI</span>
                                    <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                                      Plans starting from {money(Math.round(cart.totals.total / 3))}/month for 3 months
                                    </span>
                                  </div>
                                </div>
                                <span className="font-label-sm text-label-sm text-outline">3–12 Months</span>
                              </label>
                            </div>

                            <button
                              type="button"
                              onClick={handlePlaceOrderSubmit}
                              disabled={isSubmitting}
                              className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70"
                              data-testid="submit-order-button"
                            >
                              <span>{isSubmitting ? "Connecting…" : "Continue with Selected Plan"}</span>
                              {!isSubmitting && <span aria-hidden className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>

            {/* Right Column (5 cols on lg, 4 on xl): Order Summary & Interactive Panel */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-28">
              <div className="flex flex-col gap-space-md bg-surface-container-lowest p-space-lg rounded-lg shadow-md border border-surface-container-high/40">
                {/* Summary Header */}
                <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high/50">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-medium">Order Summary</h2>
                  <span className="px-space-sm py-0.5 bg-surface-container text-on-surface-variant font-label-caps text-label-caps rounded-full">
                    {totalItemCount} {totalItemCount === 1 ? "ITEM" : "ITEMS"}
                  </span>
                </div>

                {/* Items Presentation List */}
                <ul className="flex max-h-80 flex-col gap-space-sm overflow-y-auto" data-testid="items-table">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-space-md p-space-sm bg-surface-container-low rounded-lg"
                      data-testid="product-row"
                    >
                      <div className="w-20 h-24 overflow-hidden rounded bg-surface-container-high flex-shrink-0 relative">
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.productTitle}
                            fill
                            sizes="80px"
                            className="object-cover object-center"
                          />
                        ) : null}
                      </div>
                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div>
                          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block">
                            EVERWEAR ATELIER
                          </span>
                          <h3 className="font-body-md text-body-md text-on-surface font-medium truncate" data-testid="product-title">
                            {item.productTitle}
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {item.variantTitle ? `Size: ${item.variantTitle} • ` : ""}Qty: {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-baseline justify-between mt-space-xs">
                          <span className="font-label-caps text-label-caps text-on-surface-variant">Archival Loom</span>
                          <span className="font-headline-sm text-headline-sm text-primary font-medium tabular-nums">
                            {money(item.total)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Promotional Voucher Module */}
                <div className="pt-space-xs">
                  <PromoCode cart={cart} />
                </div>

                {/* Detailed Price Breakdown */}
                <div className="flex flex-col gap-space-xs pt-space-sm border-t border-surface-container-high/40 tabular-nums">
                  <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                    <span>Bag Total</span>
                    <span className="text-on-surface font-medium">{money(cart.totals.itemSubtotal)}</span>
                  </div>
                  {cart.totals.discountTotal > 0 && (
                    <div className="flex justify-between font-body-sm text-body-sm text-secondary">
                      <span>Privilege Member Discount</span>
                      <span className="font-medium">- {money(cart.totals.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-1">Delivery Fee</span>
                    <span className={isFreeDelivery ? "text-emerald-700 font-semibold tracking-wide" : "text-on-surface font-medium"}>
                      {isFreeDelivery ? "FREE" : money(deliveryFee)}
                    </span>
                  </div>
                  <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                    <span>Estimated GST (Inclusive)</span>
                    <span className="text-on-surface font-medium">
                      {cart.totals.taxTotal > 0 ? money(cart.totals.taxTotal) : "Included"}
                    </span>
                  </div>

                  {/* High Contrast Total */}
                  <div className="mt-space-sm pt-space-sm bg-surface-container-low p-space-md rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant block">
                        Total Payable
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">Net of luxury duties</span>
                    </div>
                    <div className="text-right">
                      <span className="font-headline-xl text-headline-xl text-primary font-medium tracking-tight" data-testid="checkout-total">
                        {money(cart.totals.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Call to Action */}
                <div className="pt-space-xs">
                  {stage !== "payment" ? (
                    <button
                      type="button"
                      onClick={handleContinue}
                      disabled={isSubmitting}
                      className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-space-sm rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-md group cursor-pointer disabled:opacity-70"
                      data-testid="checkout-continue-button"
                    >
                      <span>
                        {isSubmitting
                          ? "Securing…"
                          : stage === "address"
                          ? "CONTINUE TO DELIVERY"
                          : "CONTINUE TO PAYMENT"}
                      </span>
                      {!isSubmitting && (
                        <span aria-hidden className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      )}
                    </button>
                  ) : (
                    <p className="text-center text-[12px] text-on-surface-variant" data-testid="order-terms">
                      By placing the order, you agree to our{" "}
                      <a href={`/${countryCode}/terms`} className="underline underline-offset-2 hover:text-primary">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href={`/${countryCode}/privacy`} className="underline underline-offset-2 hover:text-primary">
                        Privacy Policy
                      </a>
                      .
                    </p>
                  )}
                </div>

                {/* Security & Guarantee Artifacts */}
                <div className="pt-space-sm flex flex-col gap-space-xs text-on-surface-variant">
                  <div className="flex items-center gap-space-xs font-label-sm text-label-sm">
                    <span aria-hidden className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                    <span>256-bit Bank-Grade SSL Secure Checkout</span>
                  </div>
                  <div className="flex items-center gap-space-xs font-label-sm text-label-sm">
                    <span aria-hidden className="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
                    <span>100% Genuine Atelier Raw Loom Curation</span>
                  </div>
                  <div className="flex items-center gap-space-xs font-label-sm text-label-sm">
                    <span aria-hidden className="material-symbols-outlined text-[16px] text-primary">published_with_changes</span>
                    <span>Complimentary 14-day hassle-free door returns</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
