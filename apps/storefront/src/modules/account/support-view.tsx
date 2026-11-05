"use client"

import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { StoreSelect } from "@/components/store/store-select"

// Zod Schema for Concierge Support Inquiry
const supportInquirySchema = z.object({
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(100, "Subject cannot exceed 100 characters"),
  category: z.enum(
    ["orders", "returns", "sizing", "payments", "alterations", "general"],
    { message: "Please select an inquiry category" }
  ),
  orderId: z.string().optional(),
  message: z
    .string()
    .min(10, "Please provide at least 10 characters detailing your request")
    .max(1000, "Message cannot exceed 1000 characters"),
})

type SupportInquiryData = z.infer<typeof supportInquirySchema>

export function SupportView() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [showInquiryModal, setShowInquiryModal] = useState(false)
  const [inquiryData, setInquiryData] = useState<Partial<SupportInquiryData>>({
    category: "orders",
    subject: "",
    orderId: "",
    message: "",
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [tickets, setTickets] = useState([
    {
      id: "EV-88421",
      status: "In Progress",
      subject: "Size exchange assistance for Mulberry Silk Pleated Midi Dress",
      updated: "Updated 2 hours ago by Concierge Anya",
      resolved: false,
    },
    {
      id: "EV-87109",
      status: "Resolved",
      subject: "Address modification for upcoming spring capsule shipment",
      updated: "Closed on 14 March 2025",
      resolved: true,
    },
  ])

  const faqs = [
    {
      icon: "local_shipping",
      question: "Orders & Delivery Timelines",
      answer:
        "All orders dispatched from our primary atelier are delivered via insured priority couriers. Standard delivery across India takes 3-5 business days. Express same-day dispatch is available in select metropolitan hubs for orders placed before 12:00 PM IST.",
    },
    {
      icon: "sync_alt",
      question: "Complimentary Returns & Exchanges",
      answer:
        "We offer a seamless 14-day home pick-up window for all unworn, unwashed garments with original tags attached. Log into your dashboard to initiate a return instantly, and our courier partner will retrieve the package at your preferred time slot.",
    },
    {
      icon: "credit_card",
      question: "Secure Payments & Settlement",
      answer:
        "We accept all major credit/debit cards, UPI, net banking, and encrypted digital wallets. All transactions are protected via 256-bit SSL encryption. Privilege members enjoy deferred billing options and complimentary gift wrapping on all seasonal editions.",
    },
    {
      icon: "lock",
      question: "Account Security & Privilege Tiers",
      answer:
        "Your account security is safeguarded by biometric authentication prompts and two-factor verification. Privilege status tiers (Silver, Gold, Black) are calculated annually based on your cumulative curations and grant early seasonal access.",
    },
  ]

  const handleFieldChange = (field: keyof SupportInquiryData, value: string) => {
    setInquiryData((prev) => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault()

    // ZOD VALIDATION
    const result = supportInquirySchema.safeParse(inquiryData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message
        }
      })
      setValidationErrors(fieldErrors)
      toast.error("Please correct the form errors before submitting")
      return
    }

    // Success
    const newTicketId = `EV-${Math.floor(10000 + Math.random() * 90000)}`
    setTickets((prev) => [
      {
        id: newTicketId,
        status: "In Progress",
        subject: result.data.subject,
        updated: "Just now by Atelier Concierge",
        resolved: false,
      },
      ...prev,
    ])

    toast.success(`Ticket #${newTicketId} created. A concierge specialist has been assigned.`)
    setShowInquiryModal(false)
    setInquiryData({ category: "orders", subject: "", orderId: "", message: "" })
    setValidationErrors({})
  }

  return (
    <div className="flex flex-col w-full" data-testid="support-view">
      {/* Header */}
      <div className="mb-space-xl">
        <span className="font-label-caps text-label-caps text-secondary font-bold uppercase tracking-widest block mb-2">
          Customer Care &amp; Advisory
        </span>
        <h1 className="font-headline-xl text-headline-xl text-on-surface font-light tracking-tight uppercase">
          HOW CAN WE HELP?
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-2xl">
          Connect with our dedicated atelier concierges or explore curated guidance on orders, bespoke alterations, and account privileges.
        </p>
      </div>

      {/* Main Grid: 2 cols left, 1 col right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-space-xl">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col gap-space-lg">
          {/* FAQ Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-surface-container-high/60">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-surface-container-high">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Frequently Asked Questions
              </h2>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Curated Knowledge Base
              </span>
            </div>
            <div className="flex flex-col gap-3" id="faq-accordion">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index
                return (
                  <div key={faq.question} className="bg-surface-container-low rounded-lg overflow-hidden transition-all">
                    <button
                      type="button"
                      className="w-full p-4 text-left flex items-center justify-between font-label-md text-label-md font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[18px]">
                          {faq.icon}
                        </span>
                        {faq.question}
                      </span>
                      <span
                        className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 font-body-sm text-body-sm text-on-surface-variant transition-all">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Previous Support Tickets Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-surface-container-high/60">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-surface-container-high flex-wrap gap-2">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Previous Support Tickets
                </h2>
                <span className="font-label-caps text-label-caps text-secondary font-bold uppercase">
                  Active Tracker
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowInquiryModal(true)}
                className="h-9 px-4 bg-primary text-on-primary font-label-sm text-label-sm uppercase rounded hover:bg-inverse-surface transition-colors font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                New Inquiry
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 bg-surface-container-low rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-surface-container-high/40"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        ticket.resolved
                          ? "bg-surface-container-highest text-on-surface"
                          : "bg-secondary-fixed text-on-secondary-fixed"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {ticket.resolved ? "check_circle" : "support_agent"}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-label-md text-label-md font-semibold text-on-surface">
                          Ticket #{ticket.id}
                        </h4>
                        <span
                          className={`font-label-caps text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            ticket.resolved
                              ? "bg-surface-container text-on-surface-variant"
                              : "bg-secondary text-on-secondary"
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        {ticket.subject}
                      </p>
                      <span className="font-label-caps uppercase text-label-caps text-outline block mt-1">
                        {ticket.updated}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(`Viewing conversation thread for Ticket #${ticket.id}`)
                    }
                    className="h-9 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm uppercase rounded transition-colors font-medium self-start md:self-auto cursor-pointer"
                  >
                    {ticket.resolved ? "View Summary" : "View Thread"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col) */}
        <div className="flex flex-col gap-space-lg">
          {/* Instant Assistance Card */}
          <div className="bg-primary text-on-primary p-space-lg rounded-xl shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-secondary/20 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-lg bg-surface-container-lowest/10 flex items-center justify-center mb-space-md backdrop-blur-sm">
                <span className="material-symbols-outlined text-[26px]">forum</span>
              </div>
              <span className="font-label-caps text-label-caps text-secondary-fixed uppercase tracking-widest font-bold">
                Instant Assistance
              </span>
              <h3 className="font-headline-sm text-headline-sm font-semibold mt-1">
                Initiate Live Chat
              </h3>
              <p className="font-body-sm text-body-sm text-on-primary/80 mt-2">
                Connect instantly with an available atelier stylist for personalized sizing, styling advisories, or order modifications.
              </p>
            </div>
            <div className="mt-space-lg relative z-10">
              <button
                type="button"
                onClick={() => toast.success("Connecting to next available atelier stylist...")}
                className="w-full h-11 bg-surface-container-lowest text-on-surface hover:bg-surface-container-low font-label-sm text-label-sm uppercase font-semibold rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                Start Live Chat
              </button>
            </div>
          </div>

          {/* Voice Concierge Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-surface-container-high/60 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center mb-space-md">
                <span className="material-symbols-outlined text-[26px]">call</span>
              </div>
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest font-bold">
                Voice Concierge
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">
                Call Atelier Concierge
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                Privilege Gold and Black members enjoy priority phone routing with zero hold times. Available Monday to Saturday, 9 AM &ndash; 8 PM IST.
              </p>
            </div>
            <div className="mt-space-lg">
              <a
                href="tel:+911800266000"
                className="w-full h-11 bg-primary text-on-primary hover:bg-inverse-surface font-label-sm text-label-sm uppercase font-semibold rounded transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
                Call +91 1800 266 000
              </a>
            </div>
          </div>

          {/* Atelier Outpost Card */}
          <div className="p-space-lg rounded-xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-3">
            <h4 className="font-label-md text-label-md font-semibold text-on-surface uppercase tracking-wider">
              Atelier Outpost
            </h4>
            <div
              className="w-full h-36 bg-cover bg-center rounded-lg shadow-inner relative overflow-hidden"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCWSulgZMeojIfOWiivY8yeMxmzQLrGtL4xiet7IMxEoap71PHOKRIYQf3C2xuq9qwW5e2E77nKtt7bOJF79cNwqDBx_BKyyGimluRmt9LoVCZbIXBNxiqvDscxgcF8SmaT6AHNioA2F-zpcBIarmCVlCZRsJNw-jiBey6r-bRmBAeg4sDSxg4fsQX9KKlCrA7awRmZXjLiybc2iVvLD5a9Wm7C_srSlxmJVbuI02jm')",
              }}
            />
            <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm pt-1">
              <span>Flagship Boutique: DLF Emporio, New Delhi</span>
              <span className="font-label-caps text-label-caps text-secondary font-bold uppercase">Open Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* New Support Ticket Modal (with ZOD Validation) */}
      {showInquiryModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-xl shadow-[0_20px_40px_-15px_rgba(24,24,27,0.2)] p-space-lg border border-surface-container-high/80">
            <div className="flex items-center justify-between pb-space-md mb-space-md border-b border-surface-container-high">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Submit Atelier Concierge Request
                </h3>
                <span className="font-label-caps text-label-caps text-secondary uppercase font-bold">
                  Validated via Zod
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowInquiryModal(false)}
                className="text-outline hover:text-on-surface transition-colors p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitInquiry} className="flex flex-col gap-space-md" noValidate>
              {/* Category */}
              <div>
                <label htmlFor="inquiry-category" className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                  Inquiry Category
                </label>
                <StoreSelect
                  id="inquiry-category"
                  className="px-3"
                  value={inquiryData.category}
                  onValueChange={(v) => handleFieldChange("category", v)}
                  aria-invalid={!!validationErrors.category}
                  options={[
                    { value: "orders", label: "Orders & Fulfillment" },
                    { value: "returns", label: "Returns & Exchanges" },
                    { value: "sizing", label: "Bespoke Sizing & Tailoring" },
                    { value: "payments", label: "Billing & Payments" },
                    { value: "alterations", label: "Alterations Advisory" },
                    { value: "general", label: "General Inquiries" },
                  ]}
                />
                {validationErrors.category && (
                  <p className="text-xs text-error mt-1">{validationErrors.category}</p>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={inquiryData.subject ?? ""}
                  onChange={(e) => handleFieldChange("subject", e.target.value)}
                  placeholder="e.g. Size exchange for Linen Blazer"
                  className={`w-full h-11 px-3 bg-surface-container-low rounded border ${
                    validationErrors.subject ? "border-error" : "border-surface-container-high"
                  } focus:outline-none focus:border-primary text-on-surface font-body-sm`}
                />
                {validationErrors.subject && (
                  <p className="text-xs text-error mt-1">{validationErrors.subject}</p>
                )}
              </div>

              {/* Order ID (Optional) */}
              <div>
                <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                  Associated Order Number (Optional)
                </label>
                <input
                  type="text"
                  value={inquiryData.orderId ?? ""}
                  onChange={(e) => handleFieldChange("orderId", e.target.value)}
                  placeholder="e.g. EV-88421"
                  className="w-full h-11 px-3 bg-surface-container-low rounded border border-surface-container-high focus:outline-none focus:border-primary text-on-surface font-body-sm text-body-sm uppercase"
                />
              </div>

              {/* Message */}
              <div>
                <label className="font-label-caps text-label-caps text-on-surface uppercase block mb-1">
                  Detailed Message *
                </label>
                <textarea
                  rows={4}
                  value={inquiryData.message ?? ""}
                  onChange={(e) => handleFieldChange("message", e.target.value)}
                  placeholder="Please describe your consultation or assistance requirement in detail..."
                  className={`w-full p-3 bg-surface-container-low rounded border ${
                    validationErrors.message ? "border-error" : "border-surface-container-high"
                  } focus:outline-none focus:border-primary text-on-surface font-body-sm resize-none`}
                />
                {validationErrors.message && (
                  <p className="text-xs text-error mt-1">{validationErrors.message}</p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-space-sm flex items-center justify-end gap-3 border-t border-surface-container-high">
                <button
                  type="button"
                  onClick={() => setShowInquiryModal(false)}
                  className="h-11 px-6 bg-surface-container text-on-surface font-label-sm text-label-sm uppercase rounded hover:bg-surface-container-high transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 bg-primary text-on-primary font-label-sm text-label-sm uppercase rounded hover:bg-inverse-surface transition-colors font-medium shadow-sm cursor-pointer"
                >
                  Submit Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
