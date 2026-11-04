"use client"

import type { Order, OrderSummary } from "@lib/api/types"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * "View tax invoice" from the account pages. It used to draw its own invoice
 * with an invented GSTIN, CIN, invoice number and a guessed 12% tax; it now
 * opens the order's real GST invoice at /order/[id]/invoice instead. The
 * props are unchanged so every caller keeps working.
 */
export function InvoiceDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | OrderSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { countryCode } = useParams<{ countryCode: string }>()

  useEffect(() => {
    if (!open || !order) return
    onOpenChange(false)
    router.push(`/${countryCode}/order/${order.id}/invoice`)
  }, [open, order, onOpenChange, router, countryCode])

  return null
}
