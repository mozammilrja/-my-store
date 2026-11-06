import { retrieveInvoice, retrieveOrder } from "@lib/data/account"
import { getProduct, getStorePolicies, listCategories } from "@lib/data/catalog"
import { getSeller } from "@lib/data/seller"
import { getBaseURL } from "@lib/util/env"
import { formatIndianPhone, resolveGstState, stateLabel } from "@lib/util/gst-state"
import { formatMoney } from "@lib/money"
import { rupeesInWords } from "@lib/util/amount-in-words"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { InvoiceShareMenu } from "@modules/order/invoice/share-menu"
import { PrintButton } from "@modules/order/print-button"
import {
  MIcon,
  StitchPage,
  TrackingHeader,
} from "@modules/stitch/shell"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Tax Invoice | Everwear",
  robots: { index: false },
}

const IST = "Asia/Kolkata"
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: IST,
  })
const dateTime = (iso: string) =>
  `${new Date(iso)
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: IST,
    })
    .replace(" at ", ", ")} IST`
const pad = (n: number) => String(n).padStart(2, "0")
const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`

/**
 * The order's GST tax invoice, ported from the Stitch export
 * storefront_official_tax_invoice_consignment_receipt. Every figure is the
 * stored invoice's (GET /store/orders/:id/invoice), including the warehouse
 * it ships from; seller details come from getSeller() (store settings, then
 * the environment) and rows with no value are left off. Item descriptions
 * come from the live product (options, material, subtitle). The export's IRN
 * hash, e-invoice QR, signature and "signed PDF" are not real here and are
 * not shown; Print / Save as PDF prints only the document (see print rules).
 */
export default async function InvoicePage(props: {
  params: Promise<{ countryCode: string; id: string }>
}) {
  const { countryCode, id } = await props.params
  const [order, invoice, { current: policy }, seller, categories] =
    await Promise.all([
      retrieveOrder(id),
      retrieveInvoice(id),
      getStorePolicies(countryCode),
      getSeller(),
      listCategories().catch(() => []),
    ])
  if (!order || !invoice) notFound()

  // The live products behind the lines: real SKU, options, material and category.
  const handles = [
    ...new Set(order.items.map((i) => i.productHandle).filter(Boolean)),
  ]
  const products = Object.fromEntries(
    await Promise.all(
      handles.map(
        async (h) =>
          [h, await getProduct(h, countryCode).catch(() => null)] as const
      )
    )
  )
  // Invoice goods lines are written in the order's item order; delivery comes last.
  const lineInfo = (i: number) => {
    const item = order.items[i]
    const product = item ? products[item.productHandle] : null
    if (!item || !product) return null
    const variant = product.variants.find((v) => v.title === item.variantTitle)
    const options = variant
      ? Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`)
      : item.variantTitle
      ? [item.variantTitle]
      : []
    return {
      title: item.productTitle,
      sku: variant?.sku ?? null,
      description: [...options, product.material, product.subtitle]
        .filter(Boolean)
        .join(" • "),
      categoryIds: product.categoryIds,
    }
  }
  const categoryName = new Map(categories.map((c) => [c.id, c]))
  // The line's own (most specific) category, e.g. "Casual Shirts".
  const lineCategory = (ids: string[] | undefined) => {
    const known = (ids ?? []).map((id) => categoryName.get(id)).filter((c) => !!c)
    const parents = new Set(known.map((c) => c.parentId))
    return known.find((c) => !parents.has(c.id))?.name ?? known[0]?.name ?? null
  }
  // Nature of goods: the top-level categories of what was bought (e.g. "Apparel").
  const natureOfGoods = [
    ...new Set(
      order.items.flatMap((_, i) =>
        (lineInfo(i)?.categoryIds ?? []).map((id) => {
          let c = categoryName.get(id)
          while (c?.parentId && categoryName.get(c.parentId))
            c = categoryName.get(c.parentId)
          return c?.name
        })
      )
    ),
  ].filter(Boolean)
  const sellerCity =
    seller.address
      ?.split(",")
      .map((p) => p.trim())
      .find((p) => /\d{6}/.test(p))
      ?.replace(/\s*\d{6}.*$/, "") ||
    seller.state?.replace(/\s*\(\d+\)\s*$/, "") ||
    null
  const dispatch = invoice.dispatchFrom ?? null
  // Place of supply: the delivery state from the address (province, else city, else PIN).
  const supplyState = resolveGstState(invoice.shippingAddress)
  const posCode = supplyState?.code ?? null
  const invoiceUrl = `${getBaseURL()}/${countryCode}/order/${order.id}/invoice`

  const money = (n: number) => formatMoney(n, invoice.currency)
  const ship = invoice.shippingAddress
  const interState = invoice.igstTotal > 0
  const rates = [...new Set(invoice.items.map((l) => l.gstRate))]
  const rate = rates.length === 1 ? rates[0]! : null
  const half = rate !== null ? ` (${pct(rate / 2)})` : ""
  const full = rate !== null ? ` (${pct(rate)})` : ""
  const placeOfSupply = supplyState ? stateLabel(supplyState) : ship.province || ship.city
  const b2b = !!invoice.customerGstin
  const paid = order.paymentStatus === "paid"
  const lineDiscount = (d: number | undefined) =>
    d !== undefined
      ? money(d)
      : order.totals.discountTotal === 0
      ? money(0)
      : "—"
  const canceled = invoice.status === "canceled"
  // A GSTIN embeds the holder's PAN in characters 3 to 12.
  const sellerPan = seller.gstin && /^\d{2}[A-Z]{5}\d{4}[A-Z]/.test(seller.gstin) ? seller.gstin.slice(2, 12) : null
  const bill = invoice.billingAddress
  const billDiffers =
    !!bill &&
    (bill.address1 !== ship.address1 ||
      bill.postalCode !== ship.postalCode ||
      bill.firstName !== ship.firstName ||
      bill.lastName !== ship.lastName)
  const totalItems = order.items.reduce((n, i) => n + i.quantity, 0)
  const lines = invoice.items
  const sum = (f: (l: (typeof lines)[number]) => number) =>
    lines.reduce((n, l) => n + f(l), 0)
  const discountsKnown = invoice.items.every((l) => l.discount !== undefined)

  const addressLines = (x: typeof ship) => [
    [x.address1, x.address2].filter(Boolean).join(", "),
    [x.city, x.province].filter(Boolean).join(", ") +
      ` – ${x.postalCode}, ${
        x.countryCode.toUpperCase() === "IN"
          ? "India"
          : x.countryCode.toUpperCase()
      }.`,
  ]

  return (
    <StitchPage className="min-h-screen flex flex-col">
      {/* Print: only the document, full width, with its backgrounds. */}
      <style>{`@media print {
        @page { size: A4; margin: 10mm; }
        html, body { background: #fff !important; }
        #invoice-doc { zoom: 0.8; gap: 1.25rem !important; box-shadow: none !important; padding: 0 !important; border-radius: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #invoice-doc table { min-width: 0 !important; font-size: 10px; }
        #invoice-doc th, #invoice-doc td { padding-left: 4px !important; padding-right: 4px !important; }
      }`}</style>
      <TrackingHeader />
      <main
        className="w-full pt-20 print:pt-0 bg-surface print:bg-white flex-grow"
        data-testid="invoice-container"
      >
        <div className="flex flex-col w-full">
          <div className="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-space-xl print:p-0">
            {/* Document Command / Utility Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg mb-space-xl pb-space-lg border-b border-surface-container-highest print:hidden">
              <div className="flex flex-col gap-space-xs">
                <nav
                  aria-label="Breadcrumb"
                  className="flex flex-wrap items-center gap-space-xs text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wider"
                >
                  <LocalizedClientLink
                    className="hover:text-primary transition-colors"
                    href="/"
                  >
                    Everwear Boutique
                  </LocalizedClientLink>
                  <span className="text-outline-variant">/</span>
                  <LocalizedClientLink
                    className="hover:text-primary transition-colors"
                    href="/account/orders"
                  >
                    Orders
                  </LocalizedClientLink>
                  <span className="text-outline-variant">/</span>
                  <LocalizedClientLink
                    className="text-on-surface font-semibold hover:text-primary transition-colors"
                    href={`/order/${order.id}/confirmed`}
                  >
                    #{order.displayId}
                  </LocalizedClientLink>
                  <span className="text-outline-variant">/</span>
                  <span className="text-primary font-medium">
                    Official Tax Invoice
                  </span>
                </nav>
                <div className="flex flex-wrap items-center gap-space-sm mt-space-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-high text-primary font-label-caps text-label-caps uppercase tracking-widest font-semibold">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        canceled ? "bg-error" : "bg-emerald-600 animate-pulse"
                      }`}
                    />
                    {canceled
                      ? "Canceled Tax Invoice"
                      : "Original Tax Invoice • GST Regulated"}
                  </span>
                  <span className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1">
                    <MIcon
                      name="event_available"
                      className="text-[16px] text-emerald-700"
                    />
                    Issued {date(invoice.issuedAt)}
                  </span>
                </div>
              </div>
              {/* Action Panel */}
              <div
                className="flex flex-wrap items-center gap-space-sm"
                id="invoice-actions"
              >
                <PrintButton className="inline-flex items-center gap-2 px-space-md py-2.5 bg-surface-container-lowest text-on-surface hover:bg-surface-container rounded shadow-sm transition-all font-label-md text-label-md">
                  <MIcon name="print" className="text-[18px]" />
                  Print Document
                </PrintButton>
                <PrintButton
                  testId="invoice-save-pdf"
                  title="Opens the print dialog: choose “Save as PDF” as the destination"
                  className="inline-flex items-center gap-2 px-space-md py-2.5 bg-primary text-on-primary hover:bg-primary-container rounded shadow-sm transition-all font-label-md text-label-md"
                >
                  <MIcon name="download" className="text-[18px]" />
                  Save as PDF
                </PrintButton>
                <InvoiceShareMenu
                  kind="email"
                  to={order.email}
                  url={invoiceUrl}
                  subject={`Everwear tax invoice ${invoice.invoiceNumber} (order #${order.displayId})`}
                  body={`Your tax invoice for order #${order.displayId}: ${invoiceUrl}${seller.email ? `\n\nQuestions: ${seller.email}` : ""}`}
                  testId="invoice-email"
                  className="inline-flex items-center gap-2 px-space-md py-2.5 bg-surface-container-lowest text-on-surface hover:bg-surface-container rounded shadow-sm transition-all font-label-md text-label-md"
                >
                  <MIcon name="mail" className="text-[18px]" />
                  Email Dispatch
                </InvoiceShareMenu>
                <InvoiceShareMenu
                  kind="share"
                  url={invoiceUrl}
                  subject={`Everwear tax invoice ${invoice.invoiceNumber}`}
                  body={`Tax invoice for order #${order.displayId}: ${invoiceUrl}`}
                  testId="invoice-share"
                  className="p-2.5 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface rounded shadow-sm transition-all"
                >
                  <MIcon name="share" className="text-[18px] block" />
                </InvoiceShareMenu>
              </div>
            </div>

            {/* Printable Paper Slate */}
            <div
              className="w-full bg-surface-container-lowest rounded-xl shadow-xl p-space-lg md:p-space-xl lg:p-margin flex flex-col gap-space-xl relative overflow-hidden"
              id="invoice-doc"
              data-testid="invoice-doc"
            >
              {/* Top Index Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-lg border-b border-surface-container-high text-on-surface-variant font-label-caps text-label-caps uppercase">
                <div className="flex flex-wrap items-center gap-space-md">
                  <span className="tracking-widest text-primary font-bold">
                    Tax Invoice • Original for Recipient
                  </span>
                  <span>•</span>
                  <span>{b2b ? "B2B Supply" : "B2C Supply"}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-on-surface-variant">
                  <span className="font-sans font-medium text-on-surface">
                    IRN:
                  </span>
                  <span className="tracking-tight">Not applicable</span>
                </div>
              </div>

              {/* Header: Seller & Invoice Reference */}
              <div className="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-space-xl items-start">
                <div className="lg:col-span-6 print:col-span-6 flex flex-col gap-space-md">
                  <div className="flex flex-wrap items-baseline gap-space-sm">
                    <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight uppercase text-primary">
                      EVERWEAR
                    </h1>
                    <span className="font-label-caps text-label-caps tracking-widest text-on-surface-variant uppercase">
                      Atelier{sellerCity ? ` • ${sellerCity}` : ""}
                    </span>
                  </div>
                  <div
                    className="flex flex-col gap-1 text-on-surface-variant font-body-sm text-body-sm"
                    data-testid="invoice-seller"
                  >
                    {seller.legalName && (
                      <p className="font-medium text-on-surface">
                        {seller.legalName}
                      </p>
                    )}
                    {(seller.cin || sellerPan) && (
                      <p>
                        {seller.cin && <>CIN: {seller.cin}</>}
                        {seller.cin && sellerPan && " • "}
                        {sellerPan && <>PAN: {sellerPan}</>}
                      </p>
                    )}
                    {(seller.gstin || seller.state) && (
                      <p>
                        {seller.gstin && (
                          <>
                            GSTIN:{" "}
                            <span className="font-mono text-on-surface font-semibold">
                              {seller.gstin}
                            </span>
                          </>
                        )}
                        {seller.gstin && seller.state && " • "}
                        {seller.state && <>State: {seller.state}</>}
                      </p>
                    )}
                    {seller.address && (
                      <p className="max-w-md text-on-surface-variant mt-1 leading-relaxed">
                        {seller.address}
                      </p>
                    )}
                    {(seller.email || seller.phone) && (
                      <p className="mt-1 flex flex-wrap items-center gap-space-md text-label-sm font-label-sm">
                        {seller.email && <span>{seller.email}</span>}
                        {seller.email && seller.phone && <span>•</span>}
                        {seller.phone && <span>{seller.phone}</span>}
                      </p>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-6 print:col-span-6 flex flex-col items-start lg:items-end print:items-end justify-between self-stretch">
                  <div className="bg-surface-container-low p-space-md rounded-lg w-full max-w-md">
                    <div className="flex justify-between items-center gap-space-sm mb-space-sm pb-space-xs border-b border-surface-container-high">
                      <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                        Tax Invoice No.
                      </span>
                      <span
                        className="font-mono font-bold text-on-surface text-body-md"
                        data-testid="invoice-number"
                      >
                        {invoice.invoiceNumber}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-space-xs gap-x-space-md font-body-sm text-body-sm">
                      <div className="flex flex-col">
                        <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">
                          Invoice Date
                        </span>
                        <span className="font-medium text-on-surface">
                          {date(invoice.issuedAt)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">
                          Order Date
                        </span>
                        <span className="font-medium text-on-surface" data-testid="invoice-order-date">
                          {date(order.createdAt)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">
                          Total Items
                        </span>
                        <span className="font-medium text-on-surface" data-testid="invoice-total-items">
                          {totalItems}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">
                          Order Reference
                        </span>
                        <span className="font-mono font-medium text-on-surface">
                          #{invoice.displayId}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">
                          Place of Supply
                        </span>
                        <span className="font-medium text-on-surface">
                          {placeOfSupply}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">
                          Reverse Charge
                        </span>
                        <span className="font-medium text-on-surface">No</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-surface-container-high flex justify-between items-center gap-space-sm text-label-sm font-label-sm">
                        <span className="text-on-surface-variant">
                          Settlement Ref:
                        </span>
                        <span className="font-mono text-on-surface break-all text-right">
                          {order.paymentReference ??
                            (order.paymentMethod === "cod"
                              ? "Cash on delivery"
                              : "Awaiting payment")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dispatch Node & Consignee */}
              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-space-lg pt-space-xs">
                <div
                  className="p-space-md bg-surface-container-low rounded-lg flex flex-col justify-between"
                  data-testid="invoice-dispatch"
                >
                  <div>
                    <div className="flex items-center justify-between gap-space-sm pb-space-xs mb-space-xs border-b border-surface-container-high">
                      <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                        {dispatch
                          ? "Fulfillment Dispatch Node"
                          : "Dispatched From"}
                      </span>
                      {dispatch?.isDefault && (
                        <span className="font-label-caps text-label-caps uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                          Warehouse Primary
                        </span>
                      )}
                    </div>
                    {dispatch ? (
                      <>
                        <p className="font-medium text-on-surface font-body-md text-body-md">
                          {dispatch.name} ({dispatch.code})
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                          {dispatch.address},<br />
                          {dispatch.city}, {dispatch.state} {dispatch.pincode},
                          India.
                          {dispatch.gstin && (
                            <>
                              <br />
                              Warehouse GSTIN:{" "}
                              <span className="font-mono font-medium text-on-surface">
                                {dispatch.gstin}
                              </span>
                            </>
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        {seller.legalName && (
                          <p className="font-medium text-on-surface font-body-md text-body-md">
                            {seller.legalName}
                          </p>
                        )}
                        {(seller.address || seller.gstin) && (
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                            {seller.address}
                            {seller.address && seller.gstin && <br />}
                            {seller.gstin && (
                              <>
                                GSTIN:{" "}
                                <span className="font-mono font-medium text-on-surface">
                                  {seller.gstin}
                                </span>
                              </>
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-space-md pt-space-xs border-t border-surface-container-high flex flex-wrap items-center justify-between gap-space-xs text-label-sm font-label-sm text-on-surface-variant">
                    <span>
                      {natureOfGoods.length
                        ? `Nature of Goods: ${natureOfGoods.join(", ")}`
                        : `Delivery: ${order.shippingOption.name}`}
                    </span>
                    <span className="text-on-surface font-medium">
                      {b2b ? "B2B Tax Invoice" : "B2C Retail Invoice"}
                    </span>
                  </div>
                </div>
                <div
                  className="p-space-md bg-surface-container-low rounded-lg flex flex-col justify-between"
                  data-testid="invoice-consignee"
                >
                  <div>
                    <div className="flex items-center justify-between gap-space-sm pb-space-xs mb-space-xs border-b border-surface-container-high">
                      <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                        {billDiffers ? "Ship To" : <>Billed &amp; Consigned To</>}
                      </span>
                      <span className="font-label-caps text-label-caps uppercase text-primary bg-surface-container-highest px-2 py-0.5 rounded font-medium">
                        {invoice.customerGstin
                          ? `GSTIN ${invoice.customerGstin}`
                          : order.shippingOption.name}
                      </span>
                    </div>
                    <p className="font-bold text-on-surface font-body-lg text-body-lg">
                      {ship.firstName} {ship.lastName}
                      {ship.company ? `, ${ship.company}` : ""}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                      {addressLines(ship).map((l, i) => (
                        <span key={i} className="block">
                          {l}
                        </span>
                      ))}
                    </p>
                    {billDiffers && (
                      <div className="mt-space-sm pt-space-xs border-t border-surface-container-high" data-testid="invoice-bill-to">
                        <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                          Bill To
                        </span>
                        <p className="font-medium text-on-surface font-body-md text-body-md mt-1">
                          {bill.firstName} {bill.lastName}
                          {bill.company ? `, ${bill.company}` : ""}
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                          {addressLines(bill).map((l, i) => (
                            <span key={i} className="block">
                              {l}
                            </span>
                          ))}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-space-md pt-space-xs border-t border-surface-container-high flex flex-wrap items-center justify-between gap-space-xs text-label-sm font-label-sm text-on-surface-variant">
                    {ship.phone ? (
                      <span className="flex items-center gap-1 font-mono text-on-surface">
                        <MIcon name="call" className="text-[16px]" />{" "}
                        {formatIndianPhone(ship.phone)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-on-surface break-all">
                        <MIcon name="mail" className="text-[16px]" />{" "}
                        {order.email}
                      </span>
                    )}
                    {posCode && (
                      <span className="text-on-surface font-medium">
                        POS State Code: {posCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Itemized Ledger & GST Schedule */}
              <div className="w-full flex flex-col mt-space-xs">
                <div className="overflow-x-auto print:overflow-visible">
                  <table
                    className="w-full text-left border-collapse min-w-[760px]"
                    data-testid="invoice-lines"
                  >
                    <thead>
                      <tr className="bg-surface-container-high text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wider">
                        <th className="py-3 px-3 text-center w-12">#</th>
                        <th className="py-3 px-3">
                          Item Description &amp; SKU
                        </th>
                        <th className="py-3 px-3 text-center">HSN</th>
                        <th className="py-3 px-2 text-center w-12">Qty</th>
                        <th className="py-3 px-3 text-right">Unit Price</th>
                        <th className="py-3 px-3 text-right">Discount</th>
                        <th className="py-3 px-3 text-right">Taxable Val</th>
                        {interState ? (
                          <th className="py-3 px-3 text-right">IGST{full}</th>
                        ) : (
                          <>
                            <th className="py-3 px-3 text-right">CGST{half}</th>
                            <th className="py-3 px-3 text-right">SGST{half}</th>
                          </>
                        )}
                        <th className="py-3 px-4 text-right">Total (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container text-body-sm font-body-sm">
                      {invoice.items.map((l, i) => {
                        const info = l.sku === "DELIVERY" ? null : lineInfo(i)
                        return (
                          <tr
                            key={`${l.sku}-${i}`}
                            className="hover:bg-surface-container-low/60 transition-colors"
                          >
                            <td className="py-4 px-3 text-center text-on-surface-variant font-mono">
                              {pad(i + 1)}
                            </td>
                            <td className="py-4 px-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-on-surface text-body-md">
                                  {info?.title ?? l.name}
                                </span>
                                {(info?.description || lineCategory(info?.categoryIds) || rate === null) && (
                                  <span className="text-on-surface-variant text-label-sm">
                                    {[
                                      lineCategory(info?.categoryIds),
                                      info?.description,
                                      rate === null
                                        ? `GST ${pct(l.gstRate)}`
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </span>
                                )}
                                <span className="font-mono text-[11px] text-on-surface-variant mt-0.5">
                                  SKU: {info?.sku ?? l.sku}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-3 text-center font-mono text-on-surface-variant">
                              {l.hsn}
                            </td>
                            <td className="py-4 px-2 text-center font-mono font-medium">
                              {l.quantity}
                            </td>
                            <td className="py-4 px-3 text-right font-mono">
                              {money(l.unitPrice)}
                            </td>
                            <td className="py-4 px-3 text-right font-mono text-on-surface-variant">
                              {lineDiscount(l.discount)}
                            </td>
                            <td className="py-4 px-3 text-right font-mono font-medium">
                              {money(l.taxableValue)}
                            </td>
                            {interState ? (
                              <td className="py-4 px-3 text-right font-mono text-on-surface-variant">
                                {money(l.igst)}
                              </td>
                            ) : (
                              <>
                                <td className="py-4 px-3 text-right font-mono text-on-surface-variant">
                                  {money(l.cgst)}
                                </td>
                                <td className="py-4 px-3 text-right font-mono text-on-surface-variant">
                                  {money(l.sgst)}
                                </td>
                              </>
                            )}
                            <td className="py-4 px-4 text-right font-mono font-bold text-on-surface">
                              {money(l.taxableValue + l.cgst + l.sgst + l.igst)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface-container-low text-body-sm font-body-sm font-semibold text-on-surface" data-testid="invoice-lines-total">
                        <td className="py-3 px-3" />
                        <td className="py-3 px-3 font-label-caps text-label-caps uppercase tracking-wider">Total</td>
                        <td className="py-3 px-3" />
                        <td className="py-3 px-2 text-center font-mono">{sum((l) => l.quantity)}</td>
                        <td className="py-3 px-3 text-right font-mono">{money(sum((l) => l.unitPrice * l.quantity))}</td>
                        <td className="py-3 px-3 text-right font-mono">
                          {discountsKnown ? money(sum((l) => l.discount ?? 0)) : money(order.totals.discountTotal)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">{money(invoice.subtotal)}</td>
                        {interState ? (
                          <td className="py-3 px-3 text-right font-mono">{money(invoice.igstTotal)}</td>
                        ) : (
                          <>
                            <td className="py-3 px-3 text-right font-mono">{money(invoice.cgstTotal)}</td>
                            <td className="py-3 px-3 text-right font-mono">{money(invoice.sgstTotal)}</td>
                          </>
                        )}
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {money(sum((l) => l.taxableValue + l.cgst + l.sgst + l.igst))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Financial Recap */}
              <div className="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-space-xl pt-space-md border-t border-surface-container-high items-start print:break-inside-avoid">
                <div className="lg:col-span-7 print:col-span-7 flex flex-col gap-space-lg">
                  <div className="bg-surface-container-low p-space-md rounded-lg">
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider">
                      Invoice Sum in Words (INR)
                    </span>
                    <p className="font-headline-sm text-body-lg text-primary font-medium mt-1 leading-snug">
                      <span data-testid="invoice-words">
                        {rupeesInWords(invoice.grandTotal)}
                      </span>
                      .
                    </p>
                  </div>
                  <div
                    className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs"
                    data-testid="invoice-payment"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-space-xs pb-space-xs border-b border-surface-container-high">
                      <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                        Payment &amp; Settlement Verification
                      </span>
                      {paid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-label-caps text-label-caps font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded">
                          <MIcon name="check_circle" className="text-[14px]" />{" "}
                          Settled in Full
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-on-surface font-label-caps text-label-caps font-bold uppercase bg-surface-container-highest px-2 py-0.5 rounded">
                          <MIcon
                            name={
                              order.paymentStatus === "refunded"
                                ? "undo"
                                : "schedule"
                            }
                            className="text-[14px]"
                          />
                          {order.paymentStatus === "refunded"
                            ? "Refunded"
                            : order.paymentMethod === "cod"
                            ? "Due on Delivery"
                            : "Awaiting Payment"}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-md mt-space-xs font-body-sm text-body-sm">
                      <div>
                        <span className="text-on-surface-variant font-label-sm block">
                          Payment Channel
                        </span>
                        <span className="font-medium text-on-surface">
                          {order.paymentMethod === "cod"
                            ? "Cash on Delivery"
                            : "Razorpay (online)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant font-label-sm block">
                          Status
                        </span>
                        <span className="font-medium text-on-surface">
                          {paid
                            ? "Paid"
                            : order.paymentStatus === "refunded"
                              ? "Refunded"
                              : order.paymentMethod === "cod"
                                ? "Due on delivery"
                                : "Awaiting payment"}
                        </span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant font-label-sm block">
                          Settlement Time
                        </span>
                        <span className="font-mono text-on-surface">
                          {order.paidAt
                            ? dateTime(order.paidAt)
                            : "Not settled yet"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {order.promoCodes.length === 0 && (
                    <div className="flex items-start gap-space-sm text-on-surface-variant font-body-sm text-body-sm">
                      <MIcon
                        name="local_shipping"
                        className="text-[20px] text-primary"
                      />
                      <p>
                        <strong className="text-on-surface font-medium">
                          Delivery:
                        </strong>{" "}
                        {order.shippingOption.name},{" "}
                        {order.totals.shippingTotal === 0
                          ? "at no charge"
                          : `${money(
                              order.totals.shippingTotal
                            )} billed as its own line above`}
                        .
                      </p>
                    </div>
                  )}
                  {order.promoCodes.length > 0 && (
                    <div className="flex items-start gap-space-sm text-on-surface-variant font-body-sm text-body-sm">
                      <MIcon name="sell" className="text-[20px] text-primary" />
                      <p>
                        <strong className="text-on-surface font-medium">
                          Promotion applied:
                        </strong>{" "}
                        {order.promoCodes.join(", ")} saved{" "}
                        {money(order.totals.discountTotal)}, shared across the
                        lines above.
                      </p>
                    </div>
                  )}
                </div>
                <div
                  className="lg:col-span-5 print:col-span-5 bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-sm font-body-md text-body-md"
                  data-testid="invoice-totals"
                >
                  <div className="flex justify-between items-center gap-space-sm text-on-surface-variant pb-space-xs border-b border-surface-container-high">
                    <span>Subtotal (Total Taxable Value)</span>
                    <span className="font-mono text-on-surface font-medium">
                      {money(invoice.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-space-sm text-on-surface-variant">
                    <span>
                      Central GST (CGST
                      {rate !== null ? ` ${pct(rate / 2)}` : ""})
                    </span>
                    <span className="font-mono text-on-surface">
                      {money(invoice.cgstTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-space-sm text-on-surface-variant">
                    <span>
                      State GST (SGST / UTGST
                      {rate !== null ? ` ${pct(rate / 2)}` : ""})
                    </span>
                    <span className="font-mono text-on-surface">
                      {money(invoice.sgstTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-space-sm text-on-surface-variant">
                    <span>
                      Integrated GST (IGST
                      {rate !== null ? ` ${interState ? pct(rate) : "0%"}` : ""}
                      )
                    </span>
                    <span className="font-mono text-on-surface">
                      {money(invoice.igstTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-space-sm text-on-surface-variant pb-space-xs border-b border-surface-container-high">
                    <span>Delivery ({order.shippingOption.name})</span>
                    {order.totals.shippingTotal === 0 ? (
                      <span className="text-emerald-700 font-semibold font-label-caps text-label-caps uppercase">
                        Complimentary
                      </span>
                    ) : (
                      <span className="text-on-surface font-medium">
                        {money(order.totals.shippingTotal)} (Line above)
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-space-sm pt-space-xs">
                    <div className="flex flex-col">
                      <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                        Grand Total Payable
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Total INR (Taxes Inclusive)
                      </span>
                    </div>
                    <span
                      className="font-headline-sm text-headline-sm font-bold text-primary font-mono"
                      data-testid="invoice-total"
                    >
                      {money(invoice.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms, E-invoice Status & Issuer */}
              <div className="pt-space-lg border-t border-surface-container-high grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-space-lg items-end print:break-inside-avoid">
                <div className="md:col-span-5 print:col-span-5 flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-primary font-bold">
                    Statutory &amp; Archival Terms
                  </span>
                  <p className="leading-relaxed">
                    1. This is a computer-generated invoice and does not require
                    a physical signature.
                  </p>
                  {policy && (
                    <p className="leading-relaxed">
                      2. Items can be returned within {policy.returnWindowDays}{" "}
                      days of delivery
                      {policy.freeReturns ? "; return shipping is free" : ""}.
                    </p>
                  )}
                  <p className="leading-relaxed">
                    {policy ? "3" : "2"}. Quote invoice {invoice.invoiceNumber}{" "}
                    with any return or query.
                  </p>
                </div>
                <div className="md:col-span-3 print:col-span-3 flex flex-col items-center justify-center p-space-sm bg-surface-container-low rounded-lg text-center">
                  <div className="w-24 h-24 bg-surface-container-lowest p-2 rounded shadow-inner flex items-center justify-center text-outline">
                    <MIcon name="qr_code_2" className="!text-[64px]" />
                  </div>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant mt-2 font-mono">
                    E-Invoice QR
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    Not applicable{b2b ? "" : " (B2C invoice)"}
                  </span>
                </div>
                <div className="md:col-span-4 print:col-span-4 flex flex-col items-start md:items-end print:items-end justify-between self-stretch">
                  <div className="text-left md:text-right">
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                      For {seller.legalName ?? "Everwear"}
                    </span>
                  </div>
                  <div className="my-3 flex flex-col items-start md:items-end print:items-end">
                    <MIcon
                      name="draw"
                      className="text-[32px] text-outline-variant"
                    />
                    <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold">
                      Computer-Generated
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      No signature required
                    </span>
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant mt-1">
                      Authorized Signatory
                    </span>
                  </div>
                  <div className="text-left md:text-right text-[11px] text-on-surface-variant">
                    <span>Issued: {dateTime(invoice.issuedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Footline */}
              <div className="pt-space-md border-t border-surface-container flex flex-col gap-1 text-[11px] text-on-surface-variant">
                {seller.address && (
                  <p data-testid="invoice-regd-office">
                    Regd. office: {seller.legalName ? `${seller.legalName}, ` : ""}
                    {seller.address}
                    {seller.cin ? ` • CIN: ${seller.cin}` : ""}
                  </p>
                )}
                {(seller.email || seller.phone) && (
                  <p>
                    Contact Everwear:{" "}
                    {[seller.email, seller.phone].filter(Boolean).join(" • ")}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-1 pt-1">
                  <p>
                    Everwear tax invoice {invoice.invoiceNumber} • Order #
                    {invoice.displayId}
                  </p>
                  <p className="font-mono">DOC_UID: {invoice.id}</p>
                  <p>E. &amp; O.E. • Page 1 of 1</p>
                </div>
              </div>
            </div>

            {/* Supplementary Links */}
            <div className="mt-space-xl flex flex-col sm:flex-row items-center justify-between gap-space-md text-on-surface-variant print:hidden">
              <div className="flex flex-wrap items-center justify-center gap-space-sm font-body-sm text-body-sm">
                <MIcon name="security" className="text-[18px] text-primary" />
                <span>Something on this invoice not right?</span>
                <LocalizedClientLink
                  className="text-primary font-medium hover:underline"
                  href="/contact"
                >
                  Contact Customer Care
                </LocalizedClientLink>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-space-lg font-label-md text-label-md">
                <LocalizedClientLink
                  className="hover:text-primary transition-colors flex items-center gap-1"
                  href={`/order/${order.id}/track`}
                >
                  <MIcon name="local_shipping" className="text-[16px]" />
                  Track Order
                </LocalizedClientLink>
                <LocalizedClientLink
                  className="hover:text-primary transition-colors flex items-center gap-1"
                  href={`/order/${order.id}/confirmed`}
                >
                  <MIcon name="receipt_long" className="text-[16px]" />
                  Order Confirmation #{order.displayId}
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </div>
      </main>
    </StitchPage>
  )
}
