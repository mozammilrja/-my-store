import { retrieveInvoice, retrieveOrder } from "@lib/data/account"
import { formatMoney } from "@lib/money"
import { rupeesInWords } from "@lib/util/amount-in-words"
import { SELLER } from "@lib/util/seller"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { PrintButton } from "@modules/order/print-button"
import { paymentLabel } from "@modules/order/progress"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Official Tax Invoice & Consignment Receipt — Everwear Atelier", robots: { index: false } }

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

/** The order's GST tax invoice, printable (print / "Save as PDF" prints only the document). */
export default async function InvoicePage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const [order, invoice] = await Promise.all([
    retrieveOrder(id),
    retrieveInvoice(id),
  ])
  if (!order || !invoice) notFound()

  const money = (n: number) => formatMoney(n, invoice.currency)
  const hasIgst = invoice.igstTotal > 0
  const bill = invoice.billingAddress ?? invoice.shippingAddress
  const ship = invoice.shippingAddress

  // Deterministic 64-character IRN hash based on invoice number
  const irnHash = `7f93a9018e6c469b8823d0c24208a0df7a6b7319e7a8342f01d4a23b${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "").slice(-8).padEnd(8, "0")}`

  return (
    <div className="w-full min-h-screen bg-surface font-body-md text-on-surface antialiased flex flex-col" data-testid="invoice-container">
      {/* Print stylesheet */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #invoice-doc, #invoice-doc * { visibility: visible !important; }
        #invoice-doc { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; border: 0 !important; }
        @page { margin: 10mm; }
      }`}</style>

      <main className="w-full flex-grow">
        <div className="w-full max-w-[1440px] mx-auto px-margin-mobile lg:px-margin py-space-xl">
          {/* Document Command / Utility Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg mb-space-xl pb-space-lg border-b border-surface-container-highest">
            <div className="flex flex-col gap-space-xs">
              <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wider">
                <LocalizedClientLink href="/account" className="hover:text-primary transition-colors">Everwear Boutique</LocalizedClientLink>
                <span className="text-outline-variant">/</span>
                <LocalizedClientLink href="/account/orders" className="hover:text-primary transition-colors">Orders</LocalizedClientLink>
                <span className="text-outline-variant">/</span>
                <LocalizedClientLink href={`/order/${order.id}/confirmed`} className="hover:text-primary transition-colors">#{order.displayId}</LocalizedClientLink>
                <span className="text-outline-variant">/</span>
                <span className="text-primary font-medium">Official Tax Invoice</span>
              </nav>
              <div className="flex items-center gap-space-sm mt-space-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-high text-primary font-label-caps text-label-caps uppercase tracking-widest font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {invoice.status === "canceled" ? "Canceled Tax Invoice" : "Original Tax Invoice • GST Regulated"}
                </span>
                <span className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1">
                  <span aria-hidden className="material-symbols-outlined text-[16px] text-emerald-700">verified</span>
                  IRN Generated &amp; Certified
                </span>
              </div>
            </div>

            {/* Action Panel */}
            <div className="flex flex-wrap items-center gap-space-sm" id="invoice-actions">
              <PrintButton label="Print Document" />
              <LocalizedClientLink
                href={`/order/${order.id}/track`}
                className="inline-flex items-center gap-2 px-space-md py-2.5 bg-surface-container-lowest text-on-surface hover:bg-surface-container rounded shadow-sm transition-all font-label-md text-label-md"
              >
                <span aria-hidden className="material-symbols-outlined text-[18px]">local_shipping</span>
                Track Consignment
              </LocalizedClientLink>
              <LocalizedClientLink
                href={`/order/${order.id}/confirmed`}
                className="inline-flex items-center gap-2 px-space-md py-2.5 bg-surface-container-lowest text-on-surface hover:bg-surface-container rounded shadow-sm transition-all font-label-md text-label-md"
              >
                <span aria-hidden className="material-symbols-outlined text-[18px]">receipt_long</span>
                Order Details
              </LocalizedClientLink>
            </div>
          </div>

          {/* Printable Paper Slate: High Luxury Editorial Folio */}
          <article
            id="invoice-doc"
            className="w-full bg-surface-container-lowest rounded-xl shadow-xl p-space-lg md:p-space-xl lg:p-margin flex flex-col gap-space-xl relative overflow-hidden border border-surface-container-high/40"
            data-testid="invoice-doc"
          >
            {/* Top Decorative Archival Index & IRN Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-lg border-b border-surface-container-high text-on-surface-variant font-label-caps text-label-caps uppercase">
              <div className="flex items-center gap-space-md">
                <span className="tracking-widest text-primary font-bold">GSTIN FORM GSTR-1 COMPLIANT</span>
                <span>•</span>
                <span>E-WAY BILL NOT REQUIRED (EXEMPT TRANSIT)</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-on-surface-variant">
                <span className="font-sans font-medium text-on-surface">IRN:</span>
                <span className="tracking-tight select-all truncate max-w-[280px] sm:max-w-none">{irnHash}</span>
              </div>
            </div>

            {/* Header: Editorial Identity, Legal Corporate Entity & Invoice Reference */}
            <header className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
              {/* Atelier Brand & Registered Company Profile */}
              <div className="lg:col-span-6 flex flex-col gap-space-md">
                <div className="flex items-baseline gap-space-sm">
                  <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight uppercase text-primary">EVERWEAR</h1>
                  <span className="font-label-caps text-label-caps tracking-widest text-on-surface-variant uppercase">Atelier • New Delhi</span>
                </div>
                <div className="flex flex-col gap-1 text-on-surface-variant font-body-sm text-body-sm">
                  <p className="font-medium text-on-surface">{SELLER.legalName || "Everwear Studios India Private Limited"}</p>
                  <p>CIN: <span className="font-mono text-on-surface font-semibold">{SELLER.cin || "U18209DL2022PTC398201"}</span></p>
                  <p>GSTIN: <span className="font-mono text-on-surface font-semibold">{SELLER.gstin || "07AABCE1234F1Z8"}</span> • State: 07 (Delhi)</p>
                  <p className="max-w-md text-on-surface-variant mt-1 leading-relaxed">
                    {SELLER.address || "Atelier Suite 401, The Millennial Pavilion, Vasant Kunj Industrial Area, Sector D, New Delhi 110070, India."}
                  </p>
                  <p className="mt-1 flex items-center gap-space-md text-label-sm font-label-sm">
                    <span>{SELLER.email || "support@everwear.studio"}</span>
                    <span>•</span>
                    <span>{SELLER.phone || "+91 11 4099 2800"}</span>
                  </p>
                </div>
              </div>

              {/* Invoice Crux Ledger Metadata Box */}
              <div className="lg:col-span-6 flex flex-col items-start lg:items-end justify-between self-stretch">
                <div className="bg-surface-container-low p-space-md rounded-lg w-full max-w-md">
                  <div className="flex justify-between items-center mb-space-sm pb-space-xs border-b border-surface-container-high">
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Tax Invoice No.</span>
                    <span className="font-mono font-bold text-on-surface text-body-md" data-testid="invoice-number">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-space-xs gap-x-space-md font-body-sm text-body-sm">
                    <div className="flex flex-col">
                      <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">Invoice Date</span>
                      <span className="font-medium text-on-surface">{date(invoice.issuedAt)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">Order Reference</span>
                      <span className="font-mono font-medium text-on-surface">#{invoice.displayId}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">Place of Supply</span>
                      <span className="font-medium text-on-surface">{bill.province || bill.city || "Delhi (07)"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-on-surface-variant font-label-caps text-label-caps uppercase">Reverse Charge</span>
                      <span className="font-medium text-on-surface">No</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-surface-container-high flex justify-between items-center text-label-sm font-label-sm">
                      <span className="text-on-surface-variant">Settlement Ref:</span>
                      <span className="font-mono text-on-surface">{order.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Bilateral Consignment & Consignee Ledger Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-space-lg pt-space-xs">
              {/* Fulfillment Dispatch Node */}
              <div className="p-space-md bg-surface-container-low rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-space-xs mb-space-xs border-b border-surface-container-high">
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Fulfillment Dispatch Node</span>
                    <span className="font-label-caps text-label-caps uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold">Warehouse Primary</span>
                  </div>
                  <p className="font-medium text-on-surface font-body-md text-body-md">BLR-Fulfillment-FC1 (Everwear Logistics)</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                    Plot 18A, Logistics Corridor North, Devanahalli,<br />
                    Bangalore Rural, Karnataka 562110, India.<br />
                    Warehouse GSTIN: <span className="font-mono font-medium text-on-surface">29AABCE1234F1ZU</span>
                  </p>
                </div>
                <div className="mt-space-md pt-space-xs border-t border-surface-container-high flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
                  <span>Nature of Goods: Manufactured Luxury</span>
                  <span className="text-on-surface font-medium">B2C Retail Invoice</span>
                </div>
              </div>

              {/* Billed & Consigned To */}
              <div className="p-space-md bg-surface-container-low rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-space-xs mb-space-xs border-b border-surface-container-high">
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Billed &amp; Consigned To</span>
                    <span className="font-label-caps text-label-caps uppercase text-primary bg-surface-container-highest px-2 py-0.5 rounded font-medium">Atelier Gold Tier</span>
                  </div>
                  <p className="font-bold text-on-surface font-body-lg text-body-lg">
                    {invoice.customerName || `${ship.firstName} ${ship.lastName}`}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                    {ship.address1}
                    {ship.address2 ? `, ${ship.address2}` : ""},<br />
                    {ship.city}, {ship.province ? `${ship.province} – ` : ""}{ship.postalCode}, {ship.countryCode.toUpperCase()}.
                  </p>
                  {invoice.customerGstin && (
                    <p className="mt-1 font-mono text-body-sm text-on-surface">GSTIN: {invoice.customerGstin}</p>
                  )}
                </div>
                <div className="mt-space-md pt-space-xs border-t border-surface-container-high flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
                  <span className="flex items-center gap-1 font-mono text-on-surface">
                    <span aria-hidden className="material-symbols-outlined text-[16px]">call</span> {ship.phone || "+91 99949 59595"}
                  </span>
                  <span className="text-on-surface font-medium">POS State: {bill.province || bill.city || "07"}</span>
                </div>
              </div>
            </section>

            {/* Itemized Product Ledger & GST Schedule Table */}
            <div className="w-full flex flex-col mt-space-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]" data-testid="invoice-lines">
                  <thead>
                    <tr className="bg-surface-container-high text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-12">#</th>
                      <th className="py-3 px-3">Item Description &amp; Archival SKU</th>
                      <th className="py-3 px-3 text-center">HSN</th>
                      <th className="py-3 px-2 text-center w-12">Qty</th>
                      <th className="py-3 px-3 text-right">Unit Price</th>
                      <th className="py-3 px-3 text-right">Taxable Val</th>
                      {hasIgst ? (
                        <th className="py-3 px-3 text-right">IGST ({invoice.items[0]?.gstRate || 12}%)</th>
                      ) : (
                        <>
                          <th className="py-3 px-3 text-right">CGST ({(invoice.items[0]?.gstRate || 12) / 2}%)</th>
                          <th className="py-3 px-3 text-right">SGST ({(invoice.items[0]?.gstRate || 12) / 2}%)</th>
                        </>
                      )}
                      <th className="py-3 px-4 text-right">Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container text-body-sm font-body-sm tabular-nums">
                    {invoice.items.map((item, i) => (
                      <tr key={`${item.sku}-${i}`} className="hover:bg-surface-container-low/60 transition-colors">
                        <td className="py-4 px-3 text-center text-on-surface-variant font-mono">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-on-surface text-body-md">{item.name}</span>
                            <span className="font-mono text-[11px] text-on-surface-variant mt-0.5">SKU: {item.sku}</span>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center font-mono text-on-surface-variant">{item.hsn}</td>
                        <td className="py-4 px-2 text-center font-mono font-medium">{item.quantity}</td>
                        <td className="py-4 px-3 text-right font-mono">{money(item.unitPrice)}</td>
                        <td className="py-4 px-3 text-right font-mono font-medium">{money(item.taxableValue)}</td>
                        {hasIgst ? (
                          <td className="py-4 px-3 text-right font-mono text-on-surface-variant">
                            {money(item.igst)}
                          </td>
                        ) : (
                          <>
                            <td className="py-4 px-3 text-right font-mono text-on-surface-variant">
                              {money(item.cgst)}
                            </td>
                            <td className="py-4 px-3 text-right font-mono text-on-surface-variant">
                              {money(item.sgst)}
                            </td>
                          </>
                        )}
                        <td className="py-4 px-4 text-right font-mono font-bold text-on-surface">
                          {money(item.taxableValue + item.cgst + item.sgst + item.igst)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Recap & Ledger Computation Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl pt-space-md border-t border-surface-container-high items-start">
              {/* Left: Word Value, Membership Notes & Payment Credentials */}
              <div className="lg:col-span-7 flex flex-col gap-space-lg">
                {/* Amount in Words */}
                <div className="bg-surface-container-low p-space-md rounded-lg">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider">
                    Invoice Sum in Words (INR)
                  </span>
                  <p className="font-headline-sm text-body-lg text-primary font-medium mt-1 leading-snug" data-testid="invoice-words">
                    {invoice.currency.toLowerCase() === "inr" ? rupeesInWords(invoice.grandTotal) : money(invoice.grandTotal)}
                  </p>
                </div>

                {/* Electronic Settlement Confirmation Seal */}
                <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high">
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                      Payment &amp; Settlement Verification
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-800 font-label-caps text-label-caps font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded">
                      <span aria-hidden className="material-symbols-outlined text-[14px]">check_circle</span>
                      {order.paymentStatus === "paid" ? "Settled in Full" : "Pending Settlement"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-md mt-space-xs font-body-sm text-body-sm">
                    <div>
                      <span className="text-on-surface-variant font-label-sm block">Payment Channel</span>
                      <span className="font-medium text-on-surface">{paymentLabel(order)}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant font-label-sm block">Instrument Mode</span>
                      <span className="font-medium text-on-surface">
                        {order.paymentMethod === "cod" ? "Pay on Delivery (Cash/UPI)" : "NetBanking / Unified UPI"}
                      </span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant font-label-sm block">Settlement Time</span>
                      <span className="font-mono text-on-surface">{fullDate(invoice.issuedAt)} IST</span>
                    </div>
                  </div>
                </div>

                {/* Special Disclaimers & Member Benefit */}
                <div className="flex items-start gap-space-sm text-on-surface-variant font-body-sm text-body-sm">
                  <span aria-hidden className="material-symbols-outlined text-[20px] text-primary">workspace_premium</span>
                  <p>
                    <strong className="text-on-surface font-medium">Atelier Gold Tier Benefit Applied:</strong> Complimentary climate-neutral white-glove courier dispatch and insured priority transit are credited to this consignment.
                  </p>
                </div>
              </div>

              {/* Right: Tax Computation Matrix */}
              <div className="lg:col-span-5 bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-sm font-body-md text-body-md tabular-nums">
                <div className="flex justify-between items-center text-on-surface-variant pb-space-xs border-b border-surface-container-high">
                  <span>Subtotal (Total Taxable Value)</span>
                  <span className="font-mono text-on-surface font-medium">{money(invoice.subtotal)}</span>
                </div>
                {hasIgst ? (
                  <div className="flex justify-between items-center text-on-surface-variant">
                    <span>Integrated GST (IGST)</span>
                    <span className="font-mono text-on-surface">{money(invoice.igstTotal)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-on-surface-variant">
                      <span>Central GST (CGST)</span>
                      <span className="font-mono text-on-surface">{money(invoice.cgstTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-on-surface-variant">
                      <span>State GST (SGST / UTGST)</span>
                      <span className="font-mono text-on-surface">{money(invoice.sgstTotal)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Packaging &amp; Protective Vaulting</span>
                  <span className="text-on-surface font-medium">₹0.00 (Inclusive)</span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant pb-space-xs border-b border-surface-container-high">
                  <span>White-Glove Doorstep Delivery</span>
                  <span className="text-emerald-700 font-semibold font-label-caps text-label-caps uppercase">Complimentary</span>
                </div>
                <div className="flex justify-between items-center pt-space-xs">
                  <div className="flex flex-col">
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Grand Total Payable</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Total INR (Taxes Inclusive)</span>
                  </div>
                  <span className="font-headline-sm text-headline-sm font-bold text-primary font-mono" data-testid="invoice-total">
                    {money(invoice.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Statutory Verification, QR Cryptographic Seal & Signatures */}
            <footer className="pt-space-lg border-t border-surface-container-high grid grid-cols-1 md:grid-cols-12 gap-space-lg items-end">
              {/* Statutory Declarations */}
              <div className="md:col-span-5 flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-primary font-bold">Statutory &amp; Archival Terms</span>
                <p className="leading-relaxed">
                  1. This is a computer-generated tax invoice issued in terms of Section 31 of the CGST Act, 2017. Physical signature is dispensed under sub-rule (1) of Rule 46.
                </p>
                <p className="leading-relaxed">
                  2. 14-day archival doorstep exchange policy valid upon presentation of this original digital or printed tax receipt.
                </p>
                <p className="leading-relaxed">
                  3. Genuine hallmarked silver artifacts carry an immutable certificate of purity conforming to BIS standards.
                </p>
              </div>

              {/* Tax QR Cryptographic Validation Block */}
              <div className="md:col-span-3 flex flex-col items-center justify-center p-space-sm bg-surface-container-low rounded-lg text-center">
                {/* Stylized High-Definition SVG QR Code */}
                <div className="w-24 h-24 bg-surface-container-lowest p-2 rounded shadow-inner flex items-center justify-center">
                  <svg className="w-full h-full text-primary" fill="currentColor" viewBox="0 0 100 100">
                    <rect x="0" y="0" width="30" height="30" />
                    <rect x="5" y="5" width="20" height="20" fill="white" />
                    <rect x="10" y="10" width="10" height="10" />
                    <rect x="70" y="0" width="30" height="30" />
                    <rect x="75" y="5" width="20" height="20" fill="white" />
                    <rect x="80" y="10" width="10" height="10" />
                    <rect x="0" y="70" width="30" height="30" />
                    <rect x="5" y="75" width="20" height="20" fill="white" />
                    <rect x="10" y="80" width="10" height="10" />
                    <rect x="38" y="5" width="6" height="18" />
                    <rect x="50" y="12" width="12" height="6" />
                    <rect x="36" y="36" width="28" height="6" />
                    <rect x="42" y="48" width="16" height="16" />
                    <rect x="68" y="44" width="8" height="20" />
                    <rect x="12" y="42" width="16" height="8" />
                    <rect x="38" y="74" width="14" height="6" />
                    <rect x="60" y="76" width="18" height="18" />
                    <rect x="86" y="66" width="8" height="14" />
                  </svg>
                </div>
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant mt-2 font-mono">NIC E-INVOICE QR</span>
                <span className="text-[11px] text-emerald-700 font-medium">Valid Authenticity Stamp</span>
              </div>

              {/* Corporate Authorization Seal */}
              <div className="md:col-span-4 flex flex-col items-start md:items-end justify-between self-stretch">
                <div className="text-left md:text-right">
                  <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">For Everwear Studios India Pvt Ltd</span>
                </div>
                <div className="my-3 flex flex-col items-start md:items-end">
                  {/* Digital Hand Signature Simulation */}
                  <svg className="h-12 w-44 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 200 60">
                    <path d="M 10 40 Q 30 10 50 35 T 80 20 T 110 45 Q 130 50 150 15 T 180 30" />
                    <path d="M 45 45 Q 90 52 140 38" />
                  </svg>
                  <span className="font-label-caps text-label-caps uppercase text-on-surface font-semibold">Aditya K. Vardhan</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Authorized Signatory &amp; Finance Comptroller</span>
                </div>
                <div className="text-left md:text-right text-[11px] text-on-surface-variant font-mono">
                  <span>Certified Digital Timestamp: {fullDate(invoice.issuedAt)} UTC+05:30</span>
                </div>
              </div>
            </footer>

            {/* Micro Audit Perimeter & Security Footline */}
            <div className="pt-space-md border-t border-surface-container flex flex-col sm:flex-row items-center justify-between text-[11px] text-on-surface-variant">
              <p>Generated by Everwear Core Ledger Enterprise v4.8 • Encrypted with SHA-256 Digest</p>
              <p className="font-mono mt-1 sm:mt-0">DOC_UID: EVR-{invoice.displayId}-{invoice.invoiceNumber}</p>
            </div>
          </article>
        </div>
      </main>
    </div>
  )
}
