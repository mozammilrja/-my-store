"use client"

import { cn } from "@/lib/utils"
import { requestConciergeBooking } from "@lib/data/concierge"
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  MessageCircleIcon,
  RepeatIcon,
  ShieldIcon,
  XIcon,
} from "lucide-react"
import Image from "next/image"
import { useRef, useState, type FormEvent } from "react"
import {
  CONCIERGE_CONTACT,
  LOCATIONS,
  OCCASIONS,
  SERVICES,
  SLOTS,
  STYLISTS,
  type ServiceId,
} from "./content"
import { StoreSelect } from "@/components/store/store-select"

const field =
  "w-full h-11 px-space-md bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/50 font-body-sm text-body-sm rounded-lg outline-none transition-colors focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/15"
const label = "mb-1 block font-label-caps text-label-caps uppercase tracking-wider text-on-surface"

/** Today in the shopper's own timezone, as YYYY-MM-DD for <input type="date">. */
const localToday = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

/**
 * The interactive middle of the concierge page: the three suites, the booking
 * form and the stylists. Picking a suite or a stylist fills the form in and
 * scrolls to it, the way the design does.
 */
export function ConciergeExperience() {
  const formRef = useRef<HTMLElement>(null)
  const [service, setService] = useState<ServiceId>("virtual")
  const [location, setLocation] = useState("Remote Virtual")
  const [stylist, setStylist] = useState<string | null>(null)
  const [occasions, setOccasions] = useState<string[]>([OCCASIONS[0]!])
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<
    { ok: true; reference: string } | { ok: false; error: string } | null
  >(null)

  const selected = SERVICES.find((s) => s.id === service)!

  const pick = (id: ServiceId) => {
    const next = SERVICES.find((s) => s.id === id)!
    setService(id)
    setLocation(next.defaultLocation)
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const requestStylist = (name: string) => {
    setStylist(name)
    pick("virtual")
  }

  const toggleOccasion = (o: string) =>
    setOccasions((list) => (list.includes(o) ? list.filter((x) => x !== o) : [...list, o]))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    const data = new FormData(form)
    setPending(true)
    setResult(null)
    const res = await requestConciergeBooking({
      service,
      location,
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      date: String(data.get("date") ?? ""),
      slot: String(data.get("slot") ?? ""),
      occasions,
      stylist,
      notes: String(data.get("notes") ?? ""),
    })
    setPending(false)
    setResult(res)
    if (res.ok) {
      form.reset()
      setStylist(null)
    }
  }

  return (
    <>
      {/* The Three Concierge Suites */}
      <section className="mx-auto w-full max-w-[1440px] px-margin-mobile py-space-xl md:px-margin">
        <div className="mb-space-lg flex flex-col justify-between md:flex-row md:items-end">
          <div>
            <span className="mb-1 block font-label-caps text-label-caps uppercase tracking-widest text-secondary">
              Custom Modalities
            </span>
            <h2 className="font-headline-xl text-[clamp(2rem,4vw,2.75rem)] text-primary">The Three Concierge Suites</h2>
          </div>
          <p className="mt-2 max-w-md font-body-sm text-body-sm text-on-surface-variant md:mt-0">
            Choose your bespoke setting: from zero-friction virtual consultations to full
            white-glove living room try-ons or flagship VIP hospitality.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {SERVICES.map((s) => (
            <article
              key={s.id}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl bg-surface-container-lowest p-space-lg shadow-sm transition-shadow hover:shadow-md",
                service === s.id && "ring-1 ring-primary/30"
              )}
              data-testid="concierge-service"
            >
              {s.featured && (
                <span className="absolute -top-3 right-6 z-10 rounded-full bg-secondary px-3 py-1 font-label-caps text-label-caps uppercase tracking-wider text-on-secondary shadow-sm">
                  Signature Experience
                </span>
              )}
              <div>
                <div className="relative mb-space-md h-48 w-full overflow-hidden rounded-lg bg-surface-container">
                  <Image
                    src={s.image}
                    alt={s.imageAlt}
                    fill
                    sizes="(min-width: 768px) 30vw, 92vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded bg-surface-container-lowest/90 px-2 py-0.5 font-label-caps text-label-caps uppercase tracking-wider text-primary backdrop-blur-md">
                    {s.number}
                  </span>
                </div>
                <span
                  className={cn(
                    "font-label-caps text-label-caps uppercase tracking-widest",
                    s.featured ? "text-secondary" : "text-on-surface-variant"
                  )}
                >
                  {s.eyebrow}
                </span>
                <h3 className="mb-space-xs mt-1 font-headline-sm text-headline-sm text-primary">{s.title}</h3>
                <p className="mb-space-md font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  {s.description}
                </p>
                <ul className="mb-space-md space-y-2">
                  {s.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface">
                      <CheckCircle2Icon aria-hidden className="size-[18px] shrink-0 text-secondary" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="-mx-space-lg -mb-space-lg flex items-center justify-between rounded-b-xl bg-surface-container-low p-space-md">
                <span className="font-label-caps text-label-caps uppercase text-primary">{s.footnote}</span>
                <button
                  type="button"
                  onClick={() => pick(s.id)}
                  className="cursor-pointer rounded bg-primary px-space-md py-2 font-label-md text-label-md text-on-primary transition-colors hover:bg-primary-container"
                >
                  Select Modality
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Booking */}
      <section
        ref={formRef}
        id="concierge-booking"
        className="mx-auto w-full max-w-[1440px] scroll-mt-28 px-margin-mobile py-space-xl md:px-margin"
      >
        <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-md md:p-space-xl">
          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
            {/* Summary + WhatsApp */}
            <div className="flex flex-col justify-between rounded-xl bg-surface-container-low p-space-lg lg:col-span-4">
              <div>
                <div className="mb-2 flex items-center gap-space-xs font-label-caps text-label-caps uppercase tracking-wider text-secondary">
                  <CalendarDaysIcon aria-hidden className="size-[18px]" />
                  Real-Time Scheduling
                </div>
                <h2 className="mb-space-xs font-headline-lg text-headline-lg text-primary">Book Your Private Session</h2>
                <p className="mb-space-md font-body-sm text-body-sm text-on-surface-variant">
                  Fill in your sartorial requirements below. Our Concierge Desk will confirm your
                  slot within 30 minutes via WhatsApp or telephone concierge.
                </p>
                <div className="mb-space-md rounded-lg bg-surface-container-lowest p-space-md shadow-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
                      Selected Modality
                    </span>
                    <span className="rounded bg-secondary-fixed px-2 py-0.5 font-label-caps uppercase text-label-caps text-on-secondary-fixed">
                      {selected.tag}
                    </span>
                  </div>
                  <p className="font-headline-sm text-headline-sm text-primary" data-testid="concierge-selected">
                    {selected.title}
                  </p>
                  {stylist && (
                    <p className="mt-1 flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
                      <span>Stylist: {stylist}</span>
                      <button
                        type="button"
                        onClick={() => setStylist(null)}
                        aria-label="Remove stylist request"
                        className="cursor-pointer hover:text-on-surface"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </p>
                  )}
                  <div className="mt-space-xs flex items-center justify-between pt-space-xs font-body-sm text-body-sm text-on-surface-variant">
                    <span>Fitting Fee:</span>
                    <span className="font-semibold text-primary">₹0 (Waived for Season)</span>
                  </div>
                </div>
                <ul className="space-y-space-xs font-body-sm text-body-sm text-on-surface-variant">
                  <li className="flex items-center gap-space-xs">
                    <ShieldIcon aria-hidden className="size-4 text-on-surface" />
                    End-to-end encrypted stylist discussions
                  </li>
                  <li className="flex items-center gap-space-xs">
                    <RepeatIcon aria-hidden className="size-4 text-on-surface" />
                    Zero cancellation penalty up to 2 hours prior
                  </li>
                </ul>
              </div>
              <div className="mt-space-lg pt-space-md">
                <p className="mb-2 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                  Prefer Instant Direct Chat?
                </p>
                <a
                  href={`https://wa.me/${CONCIERGE_CONTACT.whatsappNumber}?text=${encodeURIComponent(
                    "Hello Everwear Concierge, I would like to request a bespoke styling appointment."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-space-sm rounded-lg bg-surface-container-highest px-space-md py-3 font-label-md text-label-md uppercase tracking-wider text-primary transition-colors hover:bg-surface-container"
                >
                  <MessageCircleIcon aria-hidden className="size-5 text-[#25D366]" />
                  WhatsApp {CONCIERGE_CONTACT.whatsappLabel}
                </a>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-space-md lg:col-span-8" data-testid="concierge-form">
              <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
                <div>
                  <label htmlFor="cn-name" className={label}>
                    Full Client Name *
                  </label>
                  <input
                    id="cn-name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    placeholder="e.g. Radhika Singhania"
                    className={field}
                  />
                </div>
                <div>
                  <label htmlFor="cn-phone" className={label}>
                    Contact Number (WhatsApp Enabled) *
                  </label>
                  <input
                    id="cn-phone"
                    name="phone"
                    type="tel"
                    required
                    pattern="\+?[0-9 ()\-]{7,20}"
                    autoComplete="tel"
                    placeholder="+91 98200 XXXXX"
                    className={field}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-space-md md:grid-cols-3">
                <div>
                  <label htmlFor="cn-location" className={label}>
                    Salon / Destination *
                  </label>
                  <StoreSelect
                    id="cn-location"
                    className="rounded-lg border-transparent px-space-md"
                    value={location}
                    onValueChange={setLocation}
                    options={LOCATIONS.map((l) => ({ value: l.value, label: l.label }))}
                  />
                </div>
                <div>
                  <label htmlFor="cn-date" className={label}>
                    Preferred Date *
                  </label>
                  <input
                    id="cn-date"
                    name="date"
                    type="date"
                    required
                    min={localToday()}
                    className={field}
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label htmlFor="cn-slot" className={label}>
                    Time Slot *
                  </label>
                  <StoreSelect
                    id="cn-slot"
                    name="slot"
                    className="rounded-lg border-transparent px-space-md"
                    defaultValue={SLOTS[1]}
                    options={SLOTS.map((s) => ({ value: s, label: s }))}
                  />
                </div>
              </div>

              <fieldset>
                <legend className={cn(label, "mb-2")}>
                  Styling Occasion &amp; Focus Area (Select all that apply)
                </legend>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((o) => {
                    const on = occasions.includes(o)
                    return (
                      <button
                        key={o}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleOccasion(o)}
                        className={cn(
                          "cursor-pointer rounded px-3 py-1.5 font-label-sm text-label-sm transition-colors",
                          on
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                        )}
                      >
                        {o}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <div>
                <label htmlFor="cn-notes" className={label}>
                  Wardrobe Brief, Sizing Notes, or Preferred Fabric Palette
                </label>
                <textarea
                  id="cn-notes"
                  name="notes"
                  rows={3}
                  maxLength={2000}
                  placeholder="Provide any details about your event date, preferred silhouettes (e.g. relaxed unstructured linen, structured mulberry silk kurtas), or items currently in your bag..."
                  className={cn(field, "h-auto p-space-md")}
                />
              </div>

              <div className="flex flex-col items-center justify-between gap-space-md pt-space-xs sm:flex-row">
                <p className="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  <BadgeCheckIcon aria-hidden className="size-[18px] text-secondary" />
                  Our desk confirms every request by WhatsApp or phone
                </p>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex w-full cursor-pointer items-center justify-center gap-space-xs rounded bg-primary px-space-xl py-3 font-label-md text-label-md uppercase tracking-wider text-on-primary transition-colors hover:bg-primary-container disabled:cursor-wait disabled:opacity-70 sm:w-auto"
                >
                  {pending ? "Sending…" : "Confirm Concierge Appointment"}
                  <ArrowRightIcon aria-hidden className="size-[18px]" />
                </button>
              </div>

              <div aria-live="polite">
                {result?.ok && (
                  <div
                    className="flex items-start justify-between gap-space-sm rounded-lg bg-surface-container p-space-md"
                    data-testid="concierge-success"
                  >
                    <div className="flex items-start gap-space-sm">
                      <CheckCircle2Icon aria-hidden className="size-6 shrink-0 text-secondary" />
                      <div>
                        <p className="font-label-md text-label-md font-semibold text-primary">
                          Appointment request sent · {result.reference}
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Our Fashion Director has your brief and will message you on WhatsApp
                          within 30 minutes.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResult(null)}
                      aria-label="Dismiss"
                      className="cursor-pointer text-on-surface-variant hover:text-on-surface"
                    >
                      <XIcon className="size-[18px]" />
                    </button>
                  </div>
                )}
                {result && !result.ok && (
                  <p
                    className="rounded-lg bg-error-container p-space-md font-body-sm text-body-sm text-on-error-container"
                    role="alert"
                  >
                    {result.error}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Stylists */}
      <section className="mx-auto w-full max-w-[1440px] px-margin-mobile py-space-xl md:px-margin">
        <div className="mb-space-lg flex flex-col justify-between md:flex-row md:items-end">
          <div>
            <span className="mb-1 block font-label-caps text-label-caps uppercase tracking-widest text-secondary">
              Directorial Talent
            </span>
            <h2 className="font-headline-xl text-[clamp(2rem,4vw,2.75rem)] text-primary">Meet Your Private Stylists</h2>
          </div>
          <p className="mt-2 max-w-md font-body-sm text-body-sm text-on-surface-variant md:mt-0">
            Each appointment is stewarded by senior editorial directors who have shaped global
            runway presentations and contemporary wardrobe collections.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {STYLISTS.map((p) => (
            <article
              key={p.name}
              className="group flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm"
            >
              <div className="relative h-80 w-full overflow-hidden bg-surface-container">
                <Image
                  src={p.image}
                  alt={p.imageAlt}
                  fill
                  sizes="(min-width: 768px) 30vw, 92vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute right-3 top-3 rounded bg-surface-container-lowest/90 px-2.5 py-1 font-label-caps text-label-caps uppercase tracking-wider text-primary backdrop-blur-md">
                  {p.role}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between p-space-lg">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-primary">{p.name}</h3>
                  <p className="mb-space-sm mt-0.5 font-label-md text-label-md text-secondary">{p.specialty}</p>
                  <p className="mb-space-md font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                    {p.bio}
                  </p>
                </div>
                <div className="-mx-space-lg -mb-space-lg flex items-center justify-between bg-surface-container-low p-space-md">
                  <span className="font-body-sm text-body-sm font-medium text-on-surface">{p.base}</span>
                  <button
                    type="button"
                    onClick={() => requestStylist(p.name)}
                    className="flex cursor-pointer items-center gap-1 font-label-caps text-label-caps uppercase tracking-wider text-primary transition-colors hover:text-secondary"
                  >
                    Request Slot
                    <ArrowRightIcon aria-hidden className="size-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
