"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Order, OrderSummary } from "@lib/api/types"
import { formatMoney } from "@lib/money"

export function InvoiceDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | OrderSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!order) return null

  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const handlePrint = () => {
    window.print()
  }

  const items = "items" in order && order.items ? order.items : []
  const count = "itemCount" in order ? order.itemCount : items.length
  const subtotal = "totals" in order ? order.totals.itemSubtotal : order.total
  const tax = "totals" in order ? order.totals.taxTotal : Math.round(order.total * 0.12)
  const shipping = "totals" in order ? order.totals.shippingTotal : 0
  const discount = "totals" in order ? order.totals.discountTotal : 0
  const finalTotal = "totals" in order ? order.totals.total : order.total

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface-container-lowest text-on-surface p-6 sm:p-8 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto print:p-0 print:shadow-none print:max-w-none">
        <DialogHeader className="border-b border-surface-container pb-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-widest block">
                Official Tax Invoice
              </span>
              <DialogTitle className="font-headline-lg text-headline-lg font-bold tracking-wider text-primary mt-1">
                EVERWEAR ATELIER
              </DialogTitle>
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                GSTIN: 29AAACE9482M1Z8 &bull; CIN: U74999KA2024PTC188290
              </p>
            </div>
            <div className="text-right">
              <span className="font-label-caps text-xs text-on-surface-variant uppercase block">Invoice No.</span>
              <span className="font-label-md font-bold text-primary">INV-2025-#{order.displayId}</span>
              <span className="font-body-sm text-xs text-on-surface-variant block mt-0.5">{formattedDate}</span>
            </div>
          </div>
        </DialogHeader>

        {/* Invoice Metadata */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-surface-container text-sm">
          <div>
            <span className="font-label-caps text-xs text-on-surface-variant uppercase font-semibold block mb-1">
              Billed To:
            </span>
            <p className="font-body-md font-medium text-on-surface">
              {"shippingAddress" in order && order.shippingAddress
                ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
                : "Valued Atelier Client"}
            </p>
            {"shippingAddress" in order && order.shippingAddress && (
              <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                {order.shippingAddress.address1}
                {order.shippingAddress.address2 ? `, ${order.shippingAddress.address2}` : ""}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.postalCode}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase font-semibold block mb-1">
              Order Details:
            </span>
            <p className="font-body-sm text-xs text-on-surface-variant">Order Ref: #{order.displayId}</p>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Payment Status:{" "}
              <span className="font-semibold text-emerald-700 capitalize">{order.paymentStatus}</span>
            </p>
            <p className="font-body-sm text-xs text-on-surface-variant">Currency: {order.currency.toUpperCase()}</p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-4">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-surface-container font-label-caps text-xs text-on-surface-variant uppercase">
                <th className="py-2">Item Description</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="font-body-sm text-on-surface">
                    <td className="py-2.5">
                      <p className="font-medium text-on-surface">{item.productTitle}</p>
                      <p className="text-xs text-on-surface-variant">{item.variantTitle}</p>
                    </td>
                    <td className="py-2.5 text-center">{item.quantity}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatMoney(item.unitPrice, order.currency)}</td>
                    <td className="py-2.5 text-right font-medium tabular-nums">
                      {formatMoney(item.total, order.currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-on-surface-variant font-body-sm">
                    Consignment of {count} items &bull; Ref #{order.displayId}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Calculation */}
        <div className="pt-3 border-t border-surface-container flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-on-surface-variant text-xs">
              <span>Item Subtotal:</span>
              <span className="tabular-nums font-medium text-on-surface">{formatMoney(subtotal, order.currency)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-secondary text-xs">
                <span>Atelier Advantage / Discount:</span>
                <span className="tabular-nums font-medium">-{formatMoney(discount, order.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-on-surface-variant text-xs">
              <span>Shipping & Delivery:</span>
              <span className="tabular-nums font-medium text-on-surface">
                {shipping === 0 ? "Complimentary" : formatMoney(shipping, order.currency)}
              </span>
            </div>
            <div className="flex justify-between text-on-surface-variant text-xs">
              <span>GST (Included):</span>
              <span className="tabular-nums font-medium text-on-surface">{formatMoney(tax, order.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-primary pt-2 border-t border-surface-container">
              <span>Total Paid:</span>
              <span className="tabular-nums">{formatMoney(finalTotal, order.currency)}</span>
            </div>
          </div>
        </div>

        {/* Footer info & Print Button */}
        <div className="pt-6 border-t border-surface-container flex flex-wrap items-center justify-between gap-3 print:hidden">
          <span className="font-label-caps text-[10px] text-outline uppercase">
            Computer generated tax document. No physical signature required.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded uppercase">
              Close
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-primary text-on-primary hover:bg-inverse-surface rounded uppercase flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print / Save PDF</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
