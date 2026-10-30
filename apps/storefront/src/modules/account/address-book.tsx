"use client"

import { Button } from "@/components/ui/button"
import type { Address, Customer } from "@lib/api/types"
import { deleteAddress, saveAddress } from "@lib/data/account"
import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

type Country = { code: string; name: string }
type Saved = Address & { id: string }

function AddressForm({ address, countries, onDone }: { address?: Saved; countries: Country[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveAddress, { error: null })
  const [sent, setSent] = useState(false)
  useEffect(() => {
    if (sent && !pending && !state.error) onDone()
  }, [sent, pending, state.error, onDone])

  return (
    <form action={action} onSubmit={() => setSent(true)} className="grid gap-4 rounded-xl border border-stone-200/80 bg-card p-5 sm:grid-cols-2" data-testid="address-form">
      {address && <input type="hidden" name="addressId" value={address.id} />}
      <Input label="First name" name="firstName" defaultValue={address?.firstName} required />
      <Input label="Last name" name="lastName" defaultValue={address?.lastName} required />
      <div className="sm:col-span-2">
        <Input label="Address" name="address1" defaultValue={address?.address1} required />
      </div>
      <Input label="Postal code" name="postalCode" defaultValue={address?.postalCode} required />
      <Input label="City" name="city" defaultValue={address?.city} required />
      <NativeSelect label="Country" name="countryCode" defaultValue={address?.countryCode ?? ""} required>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </NativeSelect>
      <Input label="Phone (optional)" name="phone" type="tel" defaultValue={address?.phone} />
      {state.error && (
        <p role="alert" className="text-sm text-destructive-foreground sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save address"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function AddressBook({ customer, countries }: { customer: Customer; countries: Country[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const close = () => setEditing(null)

  const remove = async (id: string) => {
    if (!window.confirm("Delete this address?")) return
    setRemoving(id)
    try {
      await deleteAddress(id)
      toast.success("Address deleted")
    } catch {
      toast.error("Couldn't delete the address. Please try again.")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="address-book">
      <ul className="grid gap-4 sm:grid-cols-2">
        {customer.addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="sm:col-span-2">
              <AddressForm address={a} countries={countries} onDone={close} />
            </li>
          ) : (
            <li key={a.id} className="flex flex-col justify-between gap-4 rounded-xl border border-stone-200/80 bg-card p-5 text-sm shadow-xs" data-testid="address-container">
              <p>
                <span className="font-semibold">
                  {a.firstName} {a.lastName}
                </span>
                <br />
                {a.address1}
                <br />
                {a.postalCode} {a.city}, {a.countryCode.toUpperCase()}
                {a.phone && (
                  <>
                    <br />
                    {a.phone}
                  </>
                )}
              </p>
              <div className="flex gap-4">
                <button type="button" onClick={() => setEditing(a.id)} className="font-semibold underline underline-offset-4">
                  Edit
                </button>
                <button type="button" onClick={() => remove(a.id)} disabled={removing === a.id} className="text-muted-foreground underline underline-offset-4 disabled:opacity-50">
                  {removing === a.id ? "Deleting" : "Delete"}
                </button>
              </div>
            </li>
          )
        )}
      </ul>
      {editing === "new" ? (
        <AddressForm countries={countries} onDone={close} />
      ) : (
        <Button variant="outline" className="w-fit" onClick={() => setEditing("new")} data-testid="add-address-button">
          Add address
        </Button>
      )}
    </div>
  )
}
