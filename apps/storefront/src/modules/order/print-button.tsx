"use client"

import type { ReactNode } from "react"

/**
 * Opens the browser's print dialog; choosing "Save as PDF" there gives a PDF
 * copy. The invoice page's print stylesheet prints only the document.
 */
export function PrintButton({
  children,
  className,
  testId = "invoice-print",
  title,
}: {
  children: ReactNode
  className: string
  testId?: string
  title?: string
}) {
  return (
    <button type="button" onClick={() => window.print()} className={`cursor-pointer ${className}`} data-testid={testId} title={title}>
      {children}
    </button>
  )
}
