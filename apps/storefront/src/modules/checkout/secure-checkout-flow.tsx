"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import type { Cart, Customer, Address } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import { saveAddresses, setShippingOption, placeOrder } from "@lib/data/shop"
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
  const router = useRouter()
  const params = useParams<{ countryCode: string }>()
  const searchParams = useSearchParams()
  const countryCode = params.countryCode || "in"
  const isIndia = countryCode.toLowerCase() === "in"

  const requestedStep = searchParams.get("step") || "address"

  // Determine active step index: 1 = Address, 2 = Delivery, 3 = Payment/Review
  const hasAddress = Boolean(cart.email && cart.shippingAddress)
  const hasDelivery = Boolean(hasAddress && cart.shippingOptionId)

  const activeStepNum =
    requestedStep === "delivery"
      ? 2
      : requestedStep === "review"
      ? 3
      : !hasAddress
      ? 1
      : !hasDelivery
      ? 2
      : 3

  // Active payment tab
  const [activeTab, setActiveTab] = useState<"upi" | "card" | "netbanking" | "cod">(
    isIndia ? "upi" : "cod"
  )

  // Address selection state
  const savedAddresses = customer?.addresses || []
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0)
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(
    savedAddresses.length === 0
  )

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
  const [upiVerified, setUpiVerified] = useState(false)
  const [upiError, setUpiError] = useState<string | null>(null)

  // Card state
  const [useNewCard, setUseNewCard] = useState(false)
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

  // Handle Verify UPI with Zod
  const handleVerifyUpi = () => {
    setUpiError(null)
    const result = upiVerificationSchema.safeParse({ vpa: upiIdInput })
    if (!result.success) {
      setUpiError(result.error.issues[0]?.message || "Invalid UPI ID")
      setUpiVerified(false)
      toast.error("Please enter a valid UPI address")
      return
    }
    setUpiVerified(true)
    toast.success(`Verified UPI ID: ${result.data.vpa}`)
  }

  // Handle Address Submit (Step 1)
  const handleAddressSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setAddressErrors({})
    setGeneralError(null)

    let targetAddr: Partial<Address>
    let targetEmail: string

    if (!showNewAddressForm && savedAddresses.length > 0) {
      const chosen = savedAddresses[selectedAddressIndex] || savedAddresses[0]
      targetAddr = chosen
      targetEmail = cart.email || customer?.email || "customer@everwear.style"
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

    const payload = {
      email: targetEmail,
      shipping: targetAddr,
      sameAsShipping: addressData.sameAsShipping,
      billing: addressData.sameAsShipping ? undefined : targetAddr,
    }

    // Validate with Zod
    const validation = checkoutAddressStepSchema.safeParse(payload)
    if (!validation.success) {
      const errMap: Record<string, string> = {}
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join(".")
        if (!errMap[path]) errMap[path] = issue.message
      })
      setAddressErrors(errMap)
      toast.error("Please complete all required delivery address fields.")
      return false
    }

    // Submit via FormData to saveAddresses
    const formData = new FormData()
    formData.append("email", targetEmail)
    formData.append("shipping.firstName", targetAddr.firstName || "")
    formData.append("shipping.lastName", targetAddr.lastName || "")
    formData.append("shipping.address1", targetAddr.address1 || "")
    if (targetAddr.address2) formData.append("shipping.address2", targetAddr.address2)
    formData.append("shipping.city", targetAddr.city || "")
    if (targetAddr.province) formData.append("shipping.province", targetAddr.province)
    formData.append("shipping.postalCode", targetAddr.postalCode || "")
    formData.append("shipping.countryCode", (targetAddr.countryCode || countryCode).toLowerCase())
    if (targetAddr.phone) formData.append("shipping.phone", targetAddr.phone)
    if (addressData.sameAsShipping) formData.append("sameAsShipping", "on")

    let result
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          result = await saveAddresses({ error: null }, formData)
          if (result?.error) {
            setGeneralError(result.error)
            toast.error(result.error)
          } else {
            router.push(`/${countryCode}/checkout?step=delivery`)
          }
        } catch (err: unknown) {
          // In Next.js redirect throws a NEXT_REDIRECT error which is caught here
          const message = err instanceof Error ? err.message : String(err)
          if (!message.includes("NEXT_REDIRECT")) {
            setGeneralError(message)
            toast.error(message)
          }
        }
        resolve()
      })
    })

    return true
  }

  // Handle Delivery Submit
  const handleDeliverySubmit = async () => {
    setGeneralError(null)
    if (selectedDeliveryId && selectedDeliveryId !== cart.shippingOptionId) {
      const shippingResult = await setShippingOption(selectedDeliveryId)
      if (shippingResult?.error) {
        setGeneralError(shippingResult.error)
        toast.error(shippingResult.error)
        return
      }
    }
    router.push(`/${countryCode}/checkout?step=review`)
  }

  // Handle Place Order Submit (Step 3 / Unified CTA)
  const handlePlaceOrderSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setGeneralError(null)

    // Ensure address is saved if not yet
    if (!cart.shippingAddress && activeStepNum === 1) {
      const ok = await handleAddressSubmit()
      if (!ok) return
    }

    // If new card is being used, validate with Zod
    if (activeTab === "card" && useNewCard) {
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

    // Determine backend payment method: COD or razorpay/stripe
    const paymentMethodValue =
      activeTab === "cod" ? "cod" : isIndia ? "razorpay" : "stripe"

    const formData = new FormData()
    formData.append("countryCode", countryCode)
    formData.append("paymentMethod", paymentMethodValue)

    startTransition(async () => {
      try {
        // The delivery choice lives in component state until now: this screen
        // merges delivery and payment into one step, so persist it before the
        // order is placed, or the cart ships on whatever option it already had.
        if (selectedDeliveryId && selectedDeliveryId !== cart.shippingOptionId) {
          const shippingResult = await setShippingOption(selectedDeliveryId)
          if (shippingResult.error) {
            setGeneralError(shippingResult.error)
            toast.error(shippingResult.error)
            return
          }
        }

        const result = await placeOrder({ error: null }, formData)
        if (result?.error) {
          setGeneralError(result.error)
          toast.error(result.error)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        if (!message.includes("NEXT_REDIRECT")) {
          setGeneralError(message)
          toast.error(message)
        }
      }
    })
  }

  // Calculate items and totals
  const items = [...cart.items].reverse()
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const selectedOption =
    options.find((o) => o.id === selectedDeliveryId) || options[0]
  const deliveryFee = selectedOption?.amount ?? cart.totals.shippingTotal

  return (
    <div className="w-full bg-surface min-h-[calc(100vh-16rem)]">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-xl w-full">
        {/* Top Progress Bar - Exact Stitch lines 9-37 */}
        <div className="mb-space-xl">
          <div className="flex items-center justify-between bg-surface-container-lowest shadow-[0_1px_4px_rgba(0,0,0,0.02)] rounded-xl px-space-lg py-space-md overflow-x-auto border border-surface-container-high/60 gap-4">
            <div className="flex items-center gap-space-md min-w-max">
              {/* Step 1: Shipping Address */}
              <div
                className={`flex items-center gap-space-xs ${
                  activeStepNum >= 1 ? "text-on-surface font-semibold" : "text-on-surface-variant"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full font-label-sm text-label-sm flex items-center justify-center font-bold ${
                    activeStepNum >= 1
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface"
                  }`}
                >
                  1
                </span>
                <span className="font-label-md text-label-md uppercase tracking-wider">
                  Shipping Address
                </span>
              </div>

              <span className="text-on-surface-variant/40">/</span>

              {/* Step 2: Delivery Method */}
              <div
                className={`flex items-center gap-space-xs ${
                  activeStepNum >= 2 ? "text-on-surface font-semibold" : "text-on-surface-variant"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full font-label-sm text-label-sm flex items-center justify-center font-bold ${
                    activeStepNum >= 2
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface"
                  }`}
                >
                  2
                </span>
                <span className="font-label-md text-label-md uppercase tracking-wider">
                  Delivery Method
                </span>
              </div>

              <span className="text-on-surface-variant/40">/</span>

              {/* Step 3: Secure Payment */}
              <div
                className={`flex items-center gap-space-xs ${
                  activeStepNum >= 3 ? "text-on-surface font-semibold" : "text-on-surface-variant"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full font-label-sm text-label-sm flex items-center justify-center font-bold ${
                    activeStepNum >= 3
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface"
                  }`}
                >
                  3
                </span>
                <span className="font-label-md text-label-md uppercase tracking-wider">
                  Secure Payment
                </span>
              </div>

              <span className="text-on-surface-variant/40">/</span>

              {/* Step 4: Review & Confirm */}
              <div className="flex items-center gap-space-xs text-on-surface-variant">
                <span className="w-7 h-7 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm flex items-center justify-center font-bold">
                  4
                </span>
                <span className="font-label-md text-label-md uppercase tracking-wider">
                  Review &amp; Confirm
                </span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-space-xs text-on-surface-variant text-label-sm font-label-sm shrink-0">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>256-Bit SSL Encrypted Checkout</span>
            </div>
          </div>
        </div>

        {generalError && (
          <div
            className="mb-space-lg p-space-md rounded-xl bg-error/10 border border-error/30 text-error font-body-sm flex items-center gap-space-sm"
            role="alert"
            data-testid="checkout-error"
          >
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{generalError}</span>
          </div>
        )}

        {/* Main 12-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* Left Column (7 cols): The 3 Bento Cards */}
          <div className="lg:col-span-7 flex flex-col gap-space-xl">
            {/* Bento Card 1: 1. Shipping Address */}
            <div
              className="bg-surface-container-lowest shadow-[0_1px_4px_rgba(0,0,0,0.02)] rounded-xl p-space-lg flex flex-col gap-space-lg border border-surface-container-high/60"
              data-testid="address-step"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    location_on
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-primary font-semibold">
                    1. Shipping Address
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewAddressForm((prev) => !prev)}
                  className="font-label-md text-label-md text-secondary hover:underline cursor-pointer"
                >
                  {showNewAddressForm ? "Use Saved Address" : "+ Add New Address"}
                </button>
              </div>

              {/* Saved Address Cards, as many as the customer actually has */}
              {!showNewAddressForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  {savedAddresses.map((addr, index) => (
                    <label
                      key={addr.id ?? index}
                      onClick={() => setSelectedAddressIndex(index)}
                      className={`relative flex flex-col p-space-md rounded-xl cursor-pointer transition-all border ${
                        selectedAddressIndex === index
                          ? "bg-surface-container/60 border-primary ring-1 ring-primary/20 shadow-xs"
                          : "bg-surface-container-lowest shadow-[0_1px_2px_rgba(0,0,0,0.04)] border-surface-container-high/60 hover:bg-surface-container/40"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-space-xs">
                        <div className="flex items-center gap-space-sm">
                          <input
                            type="radio"
                            name="shipping_address_choice"
                            checked={selectedAddressIndex === index}
                            onChange={() => setSelectedAddressIndex(index)}
                            className="accent-primary"
                          />
                          <span className="font-label-md text-label-md text-on-surface font-semibold">
                            {[addr.firstName, addr.lastName].filter(Boolean).join(" ") ||
                              [customer?.firstName, customer?.lastName].filter(Boolean).join(" ")}
                          </span>
                        </div>
                        {index === 0 && (
                          <span className="font-label-caps text-label-caps bg-surface-container-lowest text-on-surface px-2 py-0.5 rounded border border-surface-container-high/40">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant pl-6">
                        {[addr.address1, addr.address2, addr.city, addr.province]
                          .filter(Boolean)
                          .join(", ")}
                        {addr.postalCode ? ` \u2014 ${addr.postalCode}` : ""}
                      </p>
                      {addr.phone && (
                        <div className="pl-6 mt-space-sm flex items-center gap-space-sm font-label-sm text-label-sm text-on-surface-variant">
                          <span>Phone: {addr.phone}</span>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* Collapsible / Active New Address Form */}
              {showNewAddressForm && (
                <div
                  id="new-address-form"
                  className="flex flex-col gap-space-md pt-space-md bg-surface-container/30 p-space-md rounded-xl border border-surface-container-high/40"
                >
                  <span className="font-label-md text-label-md font-semibold text-on-surface">
                    Add New Delivery Address
                  </span>

                  {/* Row: First Name & Last Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    <div>
                      <input
                        type="text"
                        placeholder="First Name"
                        value={addressData.firstName}
                        onChange={(e) =>
                          setAddressData({ ...addressData, firstName: e.target.value })
                        }
                        className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                        data-testid="shipping-first-name-input"
                      />
                      {addressErrors["shipping.firstName"] && (
                        <p className="text-xs text-error mt-1">
                          {addressErrors["shipping.firstName"]}
                        </p>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={addressData.lastName}
                        onChange={(e) =>
                          setAddressData({ ...addressData, lastName: e.target.value })
                        }
                        className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                        data-testid="shipping-last-name-input"
                      />
                      {addressErrors["shipping.lastName"] && (
                        <p className="text-xs text-error mt-1">
                          {addressErrors["shipping.lastName"]}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row: Phone & Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    <div>
                      <input
                        type="tel"
                        placeholder="Phone Number (+91 98201 55489)"
                        value={addressData.phone}
                        onChange={(e) =>
                          setAddressData({ ...addressData, phone: e.target.value })
                        }
                        className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                      />
                      {addressErrors["shipping.phone"] && (
                        <p className="text-xs text-error mt-1">
                          {addressErrors["shipping.phone"]}
                        </p>
                      )}
                    </div>

                    <div>
                      <input
                        type="email"
                        placeholder="Email for dispatch updates"
                        value={addressData.email}
                        onChange={(e) =>
                          setAddressData({ ...addressData, email: e.target.value })
                        }
                        className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                        data-testid="shipping-email-input"
                      />
                      {addressErrors["email"] && (
                        <p className="text-xs text-error mt-1">
                          {addressErrors["email"]}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Street Address */}
                  <div>
                    <input
                      type="text"
                      placeholder="Street Address, Apartment, Suite, Unit"
                      value={addressData.address1}
                      onChange={(e) =>
                        setAddressData({ ...addressData, address1: e.target.value })
                      }
                      className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                      data-testid="shipping-address-input"
                    />
                    {addressErrors["shipping.address1"] && (
                      <p className="text-xs text-error mt-1">
                        {addressErrors["shipping.address1"]}
                      </p>
                    )}
                  </div>

                  {/* City, State, PIN Code */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                    <div>
                      <input
                        type="text"
                        placeholder="City"
                        value={addressData.city}
                        onChange={(e) =>
                          setAddressData({ ...addressData, city: e.target.value })
                        }
                        className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                        data-testid="shipping-city-input"
                      />
                      {addressErrors["shipping.city"] && (
                        <p className="text-xs text-error mt-1">
                          {addressErrors["shipping.city"]}
                        </p>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="State"
                        value={addressData.province}
                        onChange={(e) =>
                          setAddressData({ ...addressData, province: e.target.value })
                        }
                        className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="PIN Code"
                        value={addressData.postalCode}
                        onChange={(e) =>
                          setAddressData({ ...addressData, postalCode: e.target.value })
                        }
                        className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                        data-testid="shipping-postal-code-input"
                      />
                      {addressErrors["shipping.postalCode"] && (
                        <p className="text-xs text-error mt-1">
                          {addressErrors["shipping.postalCode"]}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Country Select */}
                  <div>
                    <select
                      value={addressData.countryCode}
                      onChange={(e) =>
                        setAddressData({ ...addressData, countryCode: e.target.value })
                      }
                      className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                      data-testid="shipping-country-select"
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-body-sm text-on-surface-variant cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={addressData.sameAsShipping}
                      onChange={(e) =>
                        setAddressData({
                          ...addressData,
                          sameAsShipping: e.target.checked,
                        })
                      }
                      className="accent-primary"
                      data-testid="billing-address-checkbox"
                    />
                    <span>Billing address is the same as shipping address</span>
                  </label>
                </div>
              )}

              {/* Step 1 Submit / Continue Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleAddressSubmit}
                  data-testid="submit-address-button"
                  className={requestedStep === "address" || showNewAddressForm ? "h-11 px-6 rounded bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider font-semibold hover:bg-inverse-surface transition-colors cursor-pointer" : "hidden"}
                >
                  Deliver to this address
                </button>
              </div>
            </div>

            {/* Bento Card 2: 2. Delivery Method */}
            <div
              className="bg-surface-container-lowest shadow-[0_1px_4px_rgba(0,0,0,0.02)] rounded-xl p-space-lg flex flex-col gap-space-lg border border-surface-container-high/60"
              data-testid="delivery-step"
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  local_shipping
                </span>
                <h2 className="font-headline-sm text-headline-sm text-primary font-semibold">
                  2. Delivery Method
                </h2>
              </div>

              {/* Delivery Options Grid - Exact Stitch lines 98-119 */}
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-space-md"
                data-testid="delivery-options-container"
              >
                {options.map((opt, idx) => {
                  const isSelected = selectedDeliveryId === opt.id
                  const isFree = opt.amount === 0
                  return (
                    <label
                      key={opt.id}
                      onClick={() => setSelectedDeliveryId(opt.id)}
                      className={`flex items-start gap-space-md p-space-md rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-surface-container/60 border-primary ring-1 ring-primary/20 shadow-xs"
                          : "bg-surface-container-lowest shadow-[0_1px_2px_rgba(0,0,0,0.04)] border-surface-container-high/60 hover:bg-surface-container/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery_speed"
                        checked={isSelected}
                        onChange={() => setSelectedDeliveryId(opt.id)}
                        className="accent-primary mt-1"
                        data-testid="delivery-option-radio"
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                            {opt.name || (idx === 0 ? "Complimentary Standard" : "Express VIP Air Courier")}
                          </span>
                          <span
                            className={`font-label-md text-label-md font-semibold ${
                              isFree ? "text-secondary" : "text-on-surface"
                            }`}
                          >
                            {isFree ? "FREE" : formatMoney(opt.amount, cart.currency)}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          {idx === 0
                            ? "Estimated delivery within 3-5 business days across India."
                            : "Priority dispatch, guaranteed 24-48 hour delivery in major metros."}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>

              {/* Step 2 Submit / Continue Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleDeliverySubmit}
                  data-testid="submit-delivery-option-button"
                  className={requestedStep === "delivery" ? "h-11 px-6 rounded bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider font-semibold hover:bg-inverse-surface transition-colors cursor-pointer" : "hidden"}
                >
                  Continue to Payment
                </button>
              </div>
            </div>

            {/* Bento Card 3: 3. Secure Payment */}
            <div
              className="bg-surface-container-lowest shadow-[0_1px_4px_rgba(0,0,0,0.02)] rounded-xl p-space-lg flex flex-col gap-space-lg border border-surface-container-high/60"
              data-testid="review-step"
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  credit_card
                </span>
                <h2 className="font-headline-sm text-headline-sm text-primary font-semibold">
                  3. Secure Payment
                </h2>
              </div>

              {/* Payment Method Tabs */}
              <div className="flex items-center gap-space-sm overflow-x-auto pb-space-xs no-scrollbar">
                {isIndia && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("upi")}
                    className={`pay-tab px-space-md py-space-xs rounded-lg font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === "upi"
                        ? "bg-primary text-on-primary font-semibold shadow-xs"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    UPI Apps
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab("card")}
                  className={`pay-tab px-space-md py-space-xs rounded-lg font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "card"
                      ? "bg-primary text-on-primary font-semibold shadow-xs"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Credit / Debit Card
                </button>

                {isIndia && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("netbanking")}
                    className={`pay-tab px-space-md py-space-xs rounded-lg font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === "netbanking"
                        ? "bg-primary text-on-primary font-semibold shadow-xs"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    NetBanking
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab("cod")}
                  className={`pay-tab px-space-md py-space-xs rounded-lg font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "cod"
                      ? "bg-primary text-on-primary font-semibold shadow-xs"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Cash on Delivery
                </button>
              </div>

              {/* Hidden Inputs for Payment Integration */}
              <input
                type="hidden"
                name="paymentMethod"
                value={activeTab === "cod" ? "cod" : isIndia ? "razorpay" : "stripe"}
                data-testid={activeTab === "cod" ? "payment-method-cod" : "payment-method-online"}
              />

              {/* Pane 1: UPI Apps */}
              {activeTab === "upi" && (
                <div className="flex flex-col gap-space-md pt-space-sm" id="pane-upi">
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Instant payment via Google Pay, PhonePe, Paytm or any BHIM UPI ID.
                  </p>

                  <div className="grid grid-cols-3 gap-space-md">
                    <label
                      onClick={() => setSelectedUpiApp("gpay")}
                      className={`flex flex-col items-center justify-center p-space-md rounded-xl cursor-pointer border transition-all ${
                        selectedUpiApp === "gpay"
                          ? "bg-surface-container/60 border-primary shadow-xs"
                          : "bg-surface-container/30 border-transparent hover:bg-surface-container"
                      }`}
                    >
                      <input
                        type="radio"
                        name="upi_app"
                        checked={selectedUpiApp === "gpay"}
                        onChange={() => setSelectedUpiApp("gpay")}
                        className="mb-space-xs accent-primary"
                      />
                      <span className="font-label-sm text-label-sm text-on-surface font-medium">
                        Google Pay
                      </span>
                    </label>

                    <label
                      onClick={() => setSelectedUpiApp("phonepe")}
                      className={`flex flex-col items-center justify-center p-space-md rounded-xl cursor-pointer border transition-all ${
                        selectedUpiApp === "phonepe"
                          ? "bg-surface-container/60 border-primary shadow-xs"
                          : "bg-surface-container/30 border-transparent hover:bg-surface-container"
                      }`}
                    >
                      <input
                        type="radio"
                        name="upi_app"
                        checked={selectedUpiApp === "phonepe"}
                        onChange={() => setSelectedUpiApp("phonepe")}
                        className="mb-space-xs accent-primary"
                      />
                      <span className="font-label-sm text-label-sm text-on-surface font-medium">
                        PhonePe
                      </span>
                    </label>

                    <label
                      onClick={() => setSelectedUpiApp("paytm")}
                      className={`flex flex-col items-center justify-center p-space-md rounded-xl cursor-pointer border transition-all ${
                        selectedUpiApp === "paytm"
                          ? "bg-surface-container/60 border-primary shadow-xs"
                          : "bg-surface-container/30 border-transparent hover:bg-surface-container"
                      }`}
                    >
                      <input
                        type="radio"
                        name="upi_app"
                        checked={selectedUpiApp === "paytm"}
                        onChange={() => setSelectedUpiApp("paytm")}
                        className="mb-space-xs accent-primary"
                      />
                      <span className="font-label-sm text-label-sm text-on-surface font-medium">
                        Paytm UPI
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-1 mt-space-xs">
                    <div className="flex items-center gap-space-sm">
                      <input
                        type="text"
                        placeholder="Enter UPI ID (e.g. username@okaxis)"
                        value={upiIdInput}
                        onChange={(e) => {
                          setUpiIdInput(e.target.value)
                          setUpiVerified(false)
                          setUpiError(null)
                        }}
                        className={`flex-1 h-11 px-space-md bg-surface-container/30 rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border ${
                          upiVerified
                            ? "border-green-600 bg-green-50/20"
                            : upiError
                            ? "border-error"
                            : "border-surface-container-high/60 focus:border-primary"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyUpi}
                        className="h-11 px-space-lg bg-surface-container text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-high transition-colors font-medium shrink-0 cursor-pointer"
                      >
                        {upiVerified ? "Verified ✓" : "Verify"}
                      </button>
                    </div>
                    {upiError && <p className="text-xs text-error mt-0.5">{upiError}</p>}
                    {upiVerified && (
                      <p className="text-xs text-green-700 font-medium">
                        UPI ID verified successfully.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pane 2: Credit / Debit Card */}
              {activeTab === "card" && (
                <div className="flex flex-col gap-space-md pt-space-sm" id="pane-card">
                  <div className="flex items-center justify-between">
                    <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                      Saved Card
                    </span>
                    <span className="font-label-caps text-label-caps text-secondary font-semibold">
                      Secured by Razorpay
                    </span>
                  </div>

                  <label
                    onClick={() => setUseNewCard(false)}
                    className={`flex items-center justify-between p-space-md rounded-xl cursor-pointer border transition-all ${
                      !useNewCard
                        ? "bg-surface-container/60 border-primary ring-1 ring-primary/20 shadow-xs"
                        : "bg-surface-container/30 border-transparent hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-center gap-space-md">
                      <input
                        type="radio"
                        name="saved_card"
                        checked={!useNewCard}
                        onChange={() => setUseNewCard(false)}
                        className="accent-primary"
                      />
                      <div>
                        <span className="font-label-md text-label-md text-on-surface font-semibold block">
                          Visa •••• 4089
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Expires 08/28
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[28px] text-on-surface-variant">
                      credit_card
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setUseNewCard((prev) => !prev)}
                    className="font-label-md text-label-md text-secondary text-left hover:underline cursor-pointer"
                  >
                    {useNewCard ? "Use Saved Card" : "+ Use a new credit or debit card"}
                  </button>

                  {useNewCard && (
                    <div className="flex flex-col gap-3 p-space-md rounded-xl bg-surface-container/30 border border-surface-container-high/60">
                      <div>
                        <input
                          type="text"
                          placeholder="Cardholder Name"
                          value={cardData.cardholderName}
                          onChange={(e) =>
                            setCardData({ ...cardData, cardholderName: e.target.value })
                          }
                          className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                        />
                        {cardErrors.cardholderName && (
                          <p className="text-xs text-error mt-1">
                            {cardErrors.cardholderName}
                          </p>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Card Number (16 digits)"
                          maxLength={19}
                          value={cardData.cardNumber}
                          onChange={(e) =>
                            setCardData({ ...cardData, cardNumber: e.target.value })
                          }
                          className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                        />
                        {cardErrors.cardNumber && (
                          <p className="text-xs text-error mt-1">{cardErrors.cardNumber}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-space-md">
                        <div>
                          <input
                            type="text"
                            placeholder="MM / YY"
                            maxLength={5}
                            value={cardData.expiry}
                            onChange={(e) =>
                              setCardData({ ...cardData, expiry: e.target.value })
                            }
                            className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                          />
                          {cardErrors.expiry && (
                            <p className="text-xs text-error mt-1">{cardErrors.expiry}</p>
                          )}
                        </div>

                        <div>
                          <input
                            type="password"
                            placeholder="CVV"
                            maxLength={4}
                            value={cardData.cvv}
                            onChange={(e) =>
                              setCardData({ ...cardData, cvv: e.target.value })
                            }
                            className="w-full h-11 px-space-md bg-surface-container-lowest rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 focus:border-primary"
                          />
                          {cardErrors.cvv && (
                            <p className="text-xs text-error mt-1">{cardErrors.cvv}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pane 3: NetBanking */}
              {activeTab === "netbanking" && (
                <div className="flex flex-col gap-space-md pt-space-sm" id="pane-netbanking">
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Select from popular Indian banking institutions:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
                    {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"].map(
                      (bank) => {
                        const isSelected = selectedBank === bank
                        return (
                          <label
                            key={bank}
                            onClick={() => setSelectedBank(bank)}
                            className={`p-space-md rounded-xl cursor-pointer text-center font-label-sm text-label-sm border transition-all ${
                              isSelected
                                ? "bg-surface-container/80 text-primary border-primary font-bold shadow-xs"
                                : "bg-surface-container/40 text-on-surface border-transparent hover:bg-surface-container"
                            }`}
                          >
                            {bank}
                          </label>
                        )
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Pane 4: Cash on Delivery */}
              {activeTab === "cod" && (
                <div className="flex flex-col gap-space-md pt-space-sm" id="pane-cod">
                  <div
                    className="p-space-md bg-surface-container/40 rounded-xl flex items-start gap-space-md border border-surface-container-high/50"
                    data-testid="payment-method-summary"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant text-[24px]">
                      info
                    </span>
                    <div>
                      <span className="font-label-md text-label-md text-on-surface font-semibold block">
                        Cash on Delivery Verification
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        Cash on delivery is available for this order. An additional ₹50 handling fee applies. A quick OTP confirmation SMS will be sent before dispatch.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols, sticky top-32): Exact Stitch Order Summary */}
          <div className="lg:col-span-5 sticky top-32">
            <div className="bg-surface-container-lowest shadow-[0_1px_4px_rgba(0,0,0,0.02)] rounded-xl p-space-lg flex flex-col gap-space-lg border border-surface-container-high/60">
              {/* Header Box */}
              <div className="flex items-center justify-between pb-space-md bg-surface-container/30 -mx-space-lg -mt-space-lg p-space-lg rounded-t-xl border-b border-surface-container-high/60">
                <h3 className="font-headline-sm text-headline-sm text-primary font-semibold">
                  Order Summary
                </h3>
                <span className="font-label-caps text-label-caps bg-secondary/10 text-secondary px-space-sm py-1 rounded-full font-bold">
                  {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"}
                </span>
              </div>

              {/* Items List */}
              <div
                className="flex flex-col gap-space-md divide-y divide-surface-container/60 max-h-72 overflow-y-auto pr-1"
                data-testid="items-table"
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-space-md pt-space-sm first:pt-0"
                    data-testid="product-row"
                  >
                    <div className="w-16 h-20 bg-surface-container-low rounded-lg overflow-hidden flex-shrink-0 relative border border-surface-container-high/60">
                      {item.thumbnail ? (
                        <Image
                          src={item.thumbnail}
                          alt={item.productTitle}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-on-surface-variant">
                          Piece
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-label-caps text-label-caps text-on-surface-variant font-semibold">
                        Everwear Atelier
                      </span>
                      <h4
                        className="font-body-md text-body-md text-on-surface font-medium truncate"
                        data-testid="product-title"
                      >
                        {item.productTitle}
                      </h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {item.variantTitle ? `Size: ${item.variantTitle} | ` : ""}Qty: {item.quantity}
                        </span>
                        <span className="font-label-md text-label-md text-on-surface font-semibold tabular-nums">
                          {formatMoney(item.total, cart.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Component */}
              <div className="pt-2 border-t border-surface-container-high/40">
                <PromoCode cart={cart} />
              </div>

              {/* Price Calculation Box */}
              <div className="flex flex-col gap-space-sm pt-space-md bg-surface-container/20 -mx-space-lg p-space-lg border-y border-surface-container-high/60">
                <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                  <span>Bag Total</span>
                  <span className="tabular-nums">
                    {formatMoney(cart.totals.itemSubtotal, cart.currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between font-body-sm text-body-sm text-secondary font-medium">
                  <span>Privilege Gold Discount</span>
                  <span className="tabular-nums">
                    {cart.totals.discountTotal > 0
                      ? `-${formatMoney(cart.totals.discountTotal, cart.currency)}`
                      : "-₹0"}
                  </span>
                </div>

                {cart.promoCodes?.length > 0 && (
                  <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                    <span>Promo Code ({cart.promoCodes.join(", ").toUpperCase()})</span>
                    <span className="text-secondary font-medium">Applied</span>
                  </div>
                )}

                <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                  <span>Delivery Fee</span>
                  {/*
                    The cart's shippingTotal only catches up once the choice is
                    persisted at place-order, so read the fee off the option the
                    shopper has actually selected on this screen.
                  */}
                  <span className="text-secondary font-medium uppercase tabular-nums">
                    {deliveryFee === 0 ? "Free" : formatMoney(deliveryFee, cart.currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                  <span>Estimated GST (Included)</span>
                  <span className="tabular-nums">
                    {formatMoney(cart.totals.taxTotal, cart.currency)}
                  </span>
                </div>
              </div>

              {/* Total Amount Row */}
              <div className="flex items-center justify-between pt-space-sm">
                <span className="font-headline-sm text-headline-sm text-primary font-bold">
                  Total Amount
                </span>
                <span className="font-headline-lg text-headline-lg text-primary font-light tabular-nums">
                  {formatMoney(cart.totals.total, cart.currency)}
                </span>
              </div>

              {/* Primary Place Secure Order CTA */}
              <button
                type="button"
                onClick={handlePlaceOrderSubmit}
                disabled={isSubmitting}
                className="w-full h-12 bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider rounded-lg hover:bg-primary-container transition-colors flex items-center justify-center gap-space-sm shadow-md cursor-pointer disabled:opacity-50"
                data-testid="submit-order-button"
              >
                <span>
                  {isSubmitting
                    ? "Securing Order..."
                    : `Place Secure Order — ${formatMoney(cart.totals.total, cart.currency)}`}
                </span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>

              {/* Security Reassurance Strip */}
              <div className="flex flex-col gap-space-sm pt-space-xs text-on-surface-variant border-t border-surface-container-high/40">
                <div className="flex items-center gap-space-sm font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    verified_user
                  </span>
                  <span>256-bit Bank-Grade SSL Secure Encryption</span>
                </div>
                <div className="flex items-center gap-space-sm font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    sync
                  </span>
                  <span>14-day hassle-free returns &amp; exchange at your doorstep</span>
                </div>
                <div className="flex items-center gap-space-sm font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    workspace_premium
                  </span>
                  <span>100% Genuine Certified Curations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
