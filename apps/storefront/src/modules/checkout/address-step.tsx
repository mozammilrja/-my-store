"use client"

import { Button } from "@/components/ui/button"
import type { Address } from "@lib/api/types"
import { saveAddresses } from "@lib/data/shop"
import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"
import { useActionState, useState } from "react"
import { FormError } from "./step"

type Country = { code: string; name: string }

function AddressFields({ prefix, value, countries, testPrefix }: { prefix: string; value: Partial<Address>; countries: Country[]; testPrefix: string }) {
  const field = (name: keyof Address) => `${prefix}.${name}`
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="First name" name={field("firstName")} autoComplete="given-name" defaultValue={value.firstName} required data-testid={`${testPrefix}-first-name-input`} />
      <Input label="Last name" name={field("lastName")} autoComplete="family-name" defaultValue={value.lastName} required data-testid={`${testPrefix}-last-name-input`} />
      <div className="sm:col-span-2">
        <Input label="Address" name={field("address1")} autoComplete="address-line1" defaultValue={value.address1} required data-testid={`${testPrefix}-address-input`} />
      </div>
      <div className="sm:col-span-2">
        <Input label="Apartment, suite (optional)" name={field("address2")} autoComplete="address-line2" defaultValue={value.address2} />
      </div>
      <Input label="Postal code" name={field("postalCode")} autoComplete="postal-code" defaultValue={value.postalCode} required data-testid={`${testPrefix}-postal-code-input`} />
      <Input label="City" name={field("city")} autoComplete="address-level2" defaultValue={value.city} required data-testid={`${testPrefix}-city-input`} />
      <NativeSelect label="Country" name={field("countryCode")} autoComplete="country" defaultValue={value.countryCode ?? ""} required data-testid={`${testPrefix}-country-select`}>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </NativeSelect>
      <Input label="State / province (optional)" name={field("province")} autoComplete="address-level1" defaultValue={value.province} />
      <Input label="Phone (optional)" name={field("phone")} type="tel" autoComplete="tel" defaultValue={value.phone} />
      <Input label="Company (optional)" name={field("company")} autoComplete="organization" defaultValue={value.company} />
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

  return (
    <form action={action} className="flex flex-col gap-6" noValidate={false}>
      <Input label="Email" name="email" type="email" autoComplete="email" defaultValue={email} required data-testid="shipping-email-input" />
      <AddressFields prefix="shipping" value={shipping} countries={countries} testPrefix="shipping" />
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="sameAsShipping" checked={same} onChange={(e) => setSame(e.target.checked)} className="size-4.5 accent-foreground" data-testid="billing-address-checkbox" />
        Billing address is the same as delivery
      </label>
      {!same && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-sm font-semibold">Billing address</legend>
          <AddressFields prefix="billing" value={billing ?? {}} countries={countries} testPrefix="billing" />
        </fieldset>
      )}
      <FormError message={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-fit" data-testid="submit-address-button">
        {pending ? "Saving" : "Continue to delivery"}
      </Button>
    </form>
  )
}
