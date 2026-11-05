"use client"

import { useLinkStatus } from "next/link"

/**
 * The export's invoice button swapped its label for a "Preparing Invoice..."
 * spinner on click. Here the button is a real link to the invoice page, and
 * the spinner shows only while that page is actually loading.
 */
export default function InvoiceLinkLabel() {
  const { pending } = useLinkStatus()
  return pending ? (
    <>
      <span aria-hidden className="material-symbols-outlined text-[20px] animate-spin">sync</span>
      <span>Preparing Invoice...</span>
    </>
  ) : (
    <>
      <span aria-hidden className="material-symbols-outlined text-[20px]">download</span>
      <span>Tax Invoice (PDF)</span>
    </>
  )
}
