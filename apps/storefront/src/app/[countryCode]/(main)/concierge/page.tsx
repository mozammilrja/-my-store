import { Metadata } from "next"
import Image from "next/image"

import { STORE_NAME } from "@lib/util/site"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ConciergeExperience } from "@modules/concierge/concierge-experience"
import { CONCIERGE_CONTACT, FAQS, STEPS } from "@modules/concierge/content"
import { ChevronDownIcon, HeadsetIcon, ShieldCheckIcon, StarHalfIcon, TruckIcon } from "lucide-react"

export const metadata: Metadata = {
  title: `Private Concierge | ${STORE_NAME}`,
  description:
    "Bespoke styling consultations, doorstep try-at-home trials and private flagship suites. Book a session with an Everwear stylist.",
}

const PILLARS = [
  { icon: ShieldCheckIcon, title: "Privilege Pass", body: "Complimentary for Gold & Platinum members" },
  { icon: HeadsetIcon, title: "24/7 Advisor", body: "Dedicated chat via WhatsApp & high-def video" },
  { icon: TruckIcon, title: "Same-Day Metro", body: "Doorstep try-on in Mumbai, Delhi & Bengaluru" },
]

/** Everwear Concierge: services, booking, stylists, fitting protocol and FAQ. */
export default function ConciergePage() {
  return (
    <div className="flex w-full flex-col bg-surface" data-testid="concierge-page">
      {/* Breadcrumb + hero */}
      <section className="mx-auto w-full max-w-[1440px] px-margin-mobile pb-space-lg pt-space-md md:px-margin">
        <nav
          aria-label="Breadcrumb"
          className="mb-space-sm flex items-center gap-space-xs font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant"
        >
          <LocalizedClientLink href="/" className="transition-colors hover:text-primary">
            Atelier Services
          </LocalizedClientLink>
          <span className="opacity-40">/</span>
          <span className="font-semibold text-primary">Private Concierge</span>
          <span className="opacity-40">/</span>
          <span className="text-secondary">Exclusive Access</span>
        </nav>

        <div className="grid grid-cols-1 items-stretch gap-gutter lg:grid-cols-12">
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-space-lg shadow-sm md:p-space-xl lg:col-span-7">
            <div>
              <div className="mb-space-md inline-flex items-center gap-space-xs rounded-full bg-surface-container px-space-sm py-1">
                <StarHalfIcon aria-hidden className="size-4 text-secondary" />
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface">
                  Haute Curation &amp; Bespoke Styling
                </span>
              </div>
              <h1 className="mb-space-sm font-display-hero text-[clamp(2.5rem,6vw,4rem)] leading-none text-primary">
                Everwear
                <br />
                <span className="font-extralight italic text-on-surface-variant">Concierge</span>
              </h1>
              <p className="mb-space-md mt-space-sm font-headline-sm text-headline-sm font-light text-on-surface">
                Bespoke Sartorial Consultation, In-Home Try-On &amp; Archival Sourcing
              </p>
              <p className="mb-space-lg max-w-xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
                Personalized styling advice, private appointment bookings at Mumbai &amp; Delhi
                flagships, doorstep try-and-buy fitting sessions, and garment custom curation
                directed by our senior fashion directors.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-space-sm rounded-lg bg-surface-container-low p-space-md sm:grid-cols-3">
              {PILLARS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-space-xs">
                  <Icon aria-hidden className="mt-0.5 size-[22px] shrink-0 text-secondary" />
                  <div>
                    <p className="font-label-md text-label-md font-semibold text-primary">{title}</p>
                    <p className="font-body-sm text-body-sm leading-tight text-on-surface-variant">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="group relative h-[380px] w-full overflow-hidden rounded-xl shadow-sm lg:col-span-5 lg:h-auto">
            <Image
              src="/images/concierge/hero-salon.jpg"
              alt="A stylist curating tailored garments on brass rails in a sunlit showroom"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-primary/80 via-primary/20 to-transparent p-space-lg text-on-primary">
              <span className="mb-1 font-label-caps text-label-caps uppercase tracking-widest text-secondary-fixed">
                Archival Lounge Mumbai
              </span>
              <p className="font-headline-sm text-headline-sm font-light text-on-primary">Suite Royale, Kala Ghoda</p>
              <p className="font-body-sm text-body-sm text-on-primary/80">
                Private fittings host only 3 clients daily by appointment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <ConciergeExperience />

      {/* 4-step protocol */}
      <section className="mx-auto w-full max-w-[1440px] px-margin-mobile py-space-xl md:px-margin">
        <div className="rounded-xl bg-surface-container p-space-lg md:p-space-xl">
          <div className="mb-space-lg max-w-2xl">
            <span className="mb-1 block font-label-caps text-label-caps uppercase tracking-widest text-secondary">
              Seamless Protocol
            </span>
            <h2 className="font-headline-xl text-[clamp(2rem,4vw,2.75rem)] text-primary">The 4-Step In-Home Fitting Protocol</h2>
            <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
              Designed specifically for our patrons who desire luxury fitting rooms inside the
              privacy of their residences without checkout risks.
            </p>
          </div>
          <ol className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <li key={step.label} className="rounded-lg bg-surface-container-lowest p-space-md shadow-sm">
                <span className="font-label-caps uppercase text-label-caps font-semibold text-secondary">{step.label}</span>
                <h3 className="mb-2 mt-1 font-headline-sm text-headline-sm text-primary">{step.title}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mb-space-lg w-full max-w-[1440px] px-margin-mobile py-space-xl md:px-margin">
        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          <div className="flex flex-col justify-between lg:col-span-4">
            <div>
              <span className="mb-1 block font-label-caps text-label-caps uppercase tracking-widest text-secondary">
                Clarity &amp; Assurance
              </span>
              <h2 className="mb-space-sm font-headline-xl text-[clamp(2rem,4vw,2.75rem)] text-primary">Frequently Asked Inquiries</h2>
              <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                Everything you need to know about our trial protocols, membership waivers, and salon
                reservations.
              </p>
            </div>
            <div className="mt-space-lg rounded-xl bg-surface-container-low p-space-md">
              <p className="mb-1 font-label-caps text-label-caps uppercase tracking-wider text-primary">
                Special Concierge Line
              </p>
              <p className="mb-space-sm font-body-sm text-body-sm text-on-surface-variant">
                Have a private wedding bridal troupe or corporate team consultation requirement?
              </p>
              <a
                href={`mailto:${CONCIERGE_CONTACT.email}`}
                className="font-label-md text-label-md font-semibold text-secondary hover:underline"
              >
                {CONCIERGE_CONTACT.email}
              </a>
            </div>
          </div>

          <div className="space-y-space-sm lg:col-span-8">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-space-md p-space-md transition-colors hover:bg-surface-container-low/50 md:p-space-lg [&::-webkit-details-marker]:hidden">
                  <span className="font-headline-sm text-headline-sm font-normal text-primary">{faq.q}</span>
                  <ChevronDownIcon
                    aria-hidden
                    className="size-5 shrink-0 text-on-surface-variant transition-transform duration-300 group-open:rotate-180"
                  />
                </summary>
                <p className="px-space-md pb-space-lg font-body-sm text-body-sm leading-relaxed text-on-surface-variant md:px-space-lg">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
