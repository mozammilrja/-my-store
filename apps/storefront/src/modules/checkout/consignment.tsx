"use client"

import { MIcon } from "./m-icon"

/** Shared pieces of the checkout steps: the error banner and the address form's field styles. */

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-space-sm p-space-md bg-error-container text-on-error-container rounded-lg font-body-sm text-body-sm" role="alert" data-testid="checkout-error">
      <MIcon name="error" className="text-[20px]" />
      <span>{message}</span>
    </div>
  )
}

/** Field style of the export's form inputs (the GSTIN fields). */
export const consignmentInput =
  "w-full h-11 px-space-md bg-surface-container-lowest font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none rounded-sm shadow-inner"
export const consignmentLabel = "font-label-caps text-label-caps uppercase text-on-surface-variant block mb-space-xs"
