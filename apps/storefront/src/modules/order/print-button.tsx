"use client"

import { PrinterIcon } from "lucide-react"

/** Opens the browser's print dialog; "Save as PDF" there gives a PDF copy. */
export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-semibold text-on-primary hover:bg-primary/90"
      data-testid="invoice-print"
    >
      <PrinterIcon aria-hidden className="size-4" />
      {label}
    </button>
  )
}
