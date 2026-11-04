"use client"

import { Button } from "@/components/ui/button"
import type { Address } from "@lib/api/types"
import { saveAddresses } from "@lib/data/shop"
import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"
import { useActionState, useState } from "react"
import { FormError } from "./step"
import { checkoutAddressStepSchema } from "@lib/validation/checkout-schemas"

type Country = { code: string; name: string }

function AddressFields({
  prefix,
  value,
  countries,
  testPrefix,
  errors,
}: {
  prefix: string
  value: Partial<Address>
  countries: Country[]
  testPrefix: string
  errors: Record<string, string>
}) {
  const field = (name: keyof Address) => `${prefix}.${name}`
  const err = (name: keyof Address) => errors[`${prefix}.${name}`]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Input
          label="First name"
          name={field("firstName")}
          autoComplete="given-name"
          defaultValue={value.firstName}
          required
          data-testid={`${testPrefix}-first-name-input`}
        />
        {err("firstName") && <p className="text-xs text-error mt-1">{err("firstName")}</p>}
      </div>

      <div>
        <Input
          label="Last name"
          name={field("lastName")}
          autoComplete="family-name"
          defaultValue={value.lastName}
          required
          data-testid={`${testPrefix}-last-name-input`}
        />
        {err("lastName") && <p className="text-xs text-error mt-1">{err("lastName")}</p>}
      </div>

      <div className="sm:col-span-2">
        <Input
          label="Address"
          name={field("address1")}
          autoComplete="address-line1"
          defaultValue={value.address1}
          required
          data-testid={`${testPrefix}-address-input`}
        />
        {err("address1") && <p className="text-xs text-error mt-1">{err("address1")}</p>}
      </div>

      <div className="sm:col-span-2">
        <Input
          label="Apartment, suite (optional)"
          name={field("address2")}
          autoComplete="address-line2"
          defaultValue={value.address2}
        />
      </div>

      <div>
        <Input
          label="Postal code / PIN"
          name={field("postalCode")}
          autoComplete="postal-code"
          defaultValue={value.postalCode}
          required
          data-testid={`${testPrefix}-postal-code-input`}
        />
        {err("postalCode") && <p className="text-xs text-error mt-1">{err("postalCode")}</p>}
      </div>

      <div>
        <Input
          label="City"
          name={field("city")}
          autoComplete="address-level2"
          defaultValue={value.city}
          required
          data-testid={`${testPrefix}-city-input`}
        />
        {err("city") && <p className="text-xs text-error mt-1">{err("city")}</p>}
      </div>

      <div>
        <NativeSelect
          label="Country"
          name={field("countryCode")}
          autoComplete="country"
          defaultValue={value.countryCode ?? ""}
          required
          data-testid={`${testPrefix}-country-select`}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        {err("countryCode") && <p className="text-xs text-error mt-1">{err("countryCode")}</p>}
      </div>

      <div>
        <Input
          label="State / province"
          name={field("province")}
          autoComplete="address-level1"
          defaultValue={value.province}
        />
      </div>

      <div>
        <Input
          label="Phone"
          name={field("phone")}
          type="tel"
          autoComplete="tel"
          defaultValue={value.phone}
        />
        {err("phone") && <p className="text-xs text-error mt-1">{err("phone")}</p>}
      </div>

      <div>
        <Input
          label="Company (optional)"
          name={field("company")}
          autoComplete="organization"
          defaultValue={value.company}
        />
      </div>
    </div>
  )
}

export function AddressStep({
  email,
  shipping,
  billing,
  countries,
}: {
  email: string
  shipping: Partial<Address>
  billing: Partial<Address> | null
  countries: Country[]
}) {
  const [state, action, pending] = useActionState(saveAddresses, { error: null })
  const [same, setSame] = useState(!billing || JSON.stringify(billing) === JSON.stringify(shipping))
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget)
    const emailVal = (formData.get("email") as string) || ""

    const readAddr = (prefix: string) => ({
      firstName: (formData.get(`${prefix}.firstName`) as string) || "",
      lastName: (formData.get(`${prefix}.lastName`) as string) || "",
      address1: (formData.get(`${prefix}.address1`) as string) || "",
      address2: (formData.get(`${prefix}.address2`) as string) || undefined,
      city: (formData.get(`${prefix}.city`) as string) || "",
      postalCode: (formData.get(`${prefix}.postalCode`) as string) || "",
      province: (formData.get(`${prefix}.province`) as string) || undefined,
      countryCode: (formData.get(`${prefix}.countryCode`) as string) || "",
      phone: (formData.get(`${prefix}.phone`) as string) || undefined,
      company: (formData.get(`${prefix}.company`) as string) || undefined,
    })

    const payload = {
      email: emailVal,
      shipping: readAddr("shipping"),
      sameAsShipping: same,
      billing: same ? undefined : readAddr("billing"),
    }

    // ZOD VALIDATION
    const result = checkoutAddressStepSchema.safeParse(payload)
    if (!result.success) {
      e.preventDefault()
      const errors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const path = issue.path.join(".")
        if (!errors[path]) {
          errors[path] = issue.message
        }
      })
      setClientErrors(errors)
      return
    }

    setClientErrors({})
  }

  return (
    <form
      action={action}
      onSubmit={handleFormSubmit}
      className="flex flex-col gap-6"
      noValidate
    >
      <div>
        <Input
          label="Email address for order & dispatch updates"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email}
          required
          data-testid="shipping-email-input"
        />
        {clientErrors["email"] && (
          <p className="text-xs text-error mt-1">{clientErrors["email"]}</p>
        )}
      </div>

      <AddressFields
        prefix="shipping"
        value={shipping}
        countries={countries}
        testPrefix="shipping"
        errors={clientErrors}
      />

      <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          name="sameAsShipping"
          checked={same}
          onChange={(e) => setSame(e.target.checked)}
          className="size-4.5 accent-primary"
          data-testid="billing-address-checkbox"
        />
        <span>Billing address is the same as delivery</span>
      </label>

      {!same && (
        <fieldset className="flex flex-col gap-4 pt-2 border-t border-surface-container-high">
          <legend className="mb-2 text-sm font-semibold uppercase tracking-wider text-on-surface">
            Billing Address
          </legend>
          <AddressFields
            prefix="billing"
            value={billing ?? {}}
            countries={countries}
            testPrefix="billing"
            errors={clientErrors}
          />
        </fieldset>
      )}

      <FormError message={state.error} />

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full sm:w-fit uppercase tracking-wider font-semibold h-12 px-8 rounded-lg"
        data-testid="submit-address-button"
      >
        {pending ? "Saving..." : "Continue to Delivery Method"}
      </Button>
    </form>
  )
}
