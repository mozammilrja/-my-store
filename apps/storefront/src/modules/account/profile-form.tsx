"use client"

import { Button } from "@/components/ui/button"
import type { Customer } from "@lib/api/types"
import { updateProfile } from "@lib/data/account"
import Input from "@modules/common/components/input"
import { useActionState, useEffect, useRef } from "react"
import { toast } from "sonner"

export function ProfileForm({ customer }: { customer: Customer }) {
  const [state, action, pending] = useActionState(updateProfile, { error: null })
  const submitted = useRef(false)

  useEffect(() => {
    if (!submitted.current || pending) return
    if (state.error) toast.error(state.error)
    else toast.success("Profile saved")
  }, [state, pending])

  return (
    <form action={action} onSubmit={() => (submitted.current = true)} className="flex max-w-lg flex-col gap-4" data-testid="profile-form">
      <div className="grid grid-cols-2 gap-3">
        <Input label="First name" name="firstName" autoComplete="given-name" defaultValue={customer.firstName ?? ""} required />
        <Input label="Last name" name="lastName" autoComplete="family-name" defaultValue={customer.lastName ?? ""} required />
      </div>
      <Input label="Email" name="emailDisplay" type="email" defaultValue={customer.email} disabled />
      <Input label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={customer.phone ?? ""} />
      <Button type="submit" disabled={pending} className="w-fit" data-testid="save-profile-button">
        {pending ? "Saving" : "Save changes"}
      </Button>
    </form>
  )
}
