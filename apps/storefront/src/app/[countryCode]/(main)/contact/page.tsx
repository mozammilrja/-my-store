import { Metadata } from "next"
import { ArrowRightIcon, HeadsetIcon, MailIcon, MessageCircleIcon, PackageSearchIcon, RotateCcwIcon, SparklesIcon, TruckIcon } from "lucide-react"

import { getStorePolicies } from "@lib/data/catalog"
import { deliveryDays, formatDayRange } from "@lib/util/policies"
import { STORE_NAME } from "@lib/util/site"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
// The WhatsApp number and email are the store's placeholders, kept with the
// concierge copy (see the note in that file): replace them there before launch.
import { CONCIERGE_CONTACT } from "@modules/concierge/content"

export const dynamic = "force-static"
export const revalidate = 60

export const metadata: Metadata = {
  title: "Contact",
  description: `How to contact ${STORE_NAME}: WhatsApp, email, order tracking, returns and delivery help.`,
}

/** Contact: the ways to reach customer care, and the self-serve answers most questions need. */
export default async function ContactPage(props: { params: Promise<{ countryCode: string }> }) {
  const { countryCode } = await props.params
  const { current } = await getStorePolicies(countryCode).catch(() => ({ current: null }))

  const channels = [
    {
      icon: MessageCircleIcon,
      title: "WhatsApp",
      body: "Message customer care. Include your order number and we'll pick it up from there.",
      action: CONCIERGE_CONTACT.whatsappLabel,
      href: `https://wa.me/${CONCIERGE_CONTACT.whatsappNumber}?text=${encodeURIComponent(`Hello ${STORE_NAME}, I need help with my order.`)}`,
      external: true,
    },
    {
      icon: MailIcon,
      title: "Email",
      body: "For anything that needs photos or documents: damaged items, invoices, business orders.",
      action: CONCIERGE_CONTACT.email,
      href: `mailto:${CONCIERGE_CONTACT.email}`,
      external: true,
    },
  ]

  const help = [
    {
      icon: PackageSearchIcon,
      title: "Track an order",
      body: "See where your parcel is with your order number and email.",
      href: "/order",
    },
    {
      icon: RotateCcwIcon,
      title: "Returns & exchanges",
      body: current
        ? `${current.returnWindowDays}-day window${current.freeReturns ? ", free doorstep pick-up" : ""}.`
        : "How to send something back.",
      href: "/returns",
    },
    {
      icon: TruckIcon,
      title: "Shipping & delivery",
      body: current
        ? `Usually ${deliveryDays(current)} business days, dispatched in ${formatDayRange(current.handlingDays)}.`
        : "Rates and delivery times.",
      href: "/shipping",
    },
    {
      icon: SparklesIcon,
      title: "Private concierge",
      body: "Styling consultations, try-at-home and flagship appointments.",
      href: "/concierge",
    },
  ]

  return (
    <div className="flex w-full flex-col bg-surface" data-testid="contact-page">
      <section className="mx-auto w-full max-w-[1440px] px-margin-mobile pb-space-lg pt-space-md md:px-margin">
        <nav
          aria-label="Breadcrumb"
          className="mb-space-sm flex items-center gap-space-xs font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant"
        >
          <LocalizedClientLink href="/" className="transition-colors hover:text-primary">
            Home
          </LocalizedClientLink>
          <span className="opacity-40">/</span>
          <span className="font-semibold text-primary">Contact</span>
        </nav>

        <div className="grid grid-cols-1 items-start gap-gutter lg:grid-cols-12">
          {/* Intro */}
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-space-lg shadow-sm md:p-space-xl lg:col-span-7">
            <div>
              <div className="mb-space-md inline-flex items-center gap-space-xs rounded-full bg-surface-container px-space-sm py-1">
                <HeadsetIcon aria-hidden className="size-4 text-secondary" />
                <span className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface">Customer care</span>
              </div>
              <h1 className="mb-space-sm font-display-hero text-[clamp(2.5rem,6vw,4rem)] leading-none text-primary">
                We&apos;re here
                <br />
                <span className="font-extralight italic text-on-surface-variant">to help</span>
              </h1>
              <p className="mb-space-lg mt-space-sm max-w-xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
                Questions about an order, a size, a delivery or a return? Reach {STORE_NAME} customer care below, and
                keep your order number handy: it&apos;s on your confirmation email and in your account.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
              {channels.map(({ icon: Icon, title, body, action, href }) => (
                <li key={title}>
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="group flex h-full flex-col gap-space-xs rounded-lg bg-surface-container-low p-space-md transition-colors hover:bg-surface-container"
                  >
                    <span className="flex items-center gap-space-xs">
                      <Icon aria-hidden className="size-[22px] shrink-0 text-secondary" />
                      <span className="font-label-md text-label-md font-semibold text-primary">{title}</span>
                    </span>
                    <span className="font-body-sm text-body-sm leading-snug text-on-surface-variant">{body}</span>
                    <span className="mt-auto flex items-center gap-1 pt-space-xs font-label-md text-label-md font-semibold text-primary break-all">
                      {action}
                      <ArrowRightIcon aria-hidden className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Before you write */}
          <div className="flex flex-col rounded-xl bg-primary p-space-lg text-on-primary shadow-sm md:p-space-xl lg:col-span-5">
            <span className="mb-1 font-label-caps text-label-caps uppercase tracking-widest text-secondary-fixed">Before you write</span>
            <h2 className="mb-space-md font-headline-sm text-headline-sm font-light">The quickest answers are often one tap away</h2>
            <ul className="flex flex-col gap-space-sm">
              {[
                "Your order number looks like #EVR-1234 and is on your order confirmation.",
                "Order status, tracking and invoices are in Account → Orders.",
                "Start a return or exchange yourself from Account → Returns.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-space-xs font-body-sm text-body-sm leading-relaxed text-on-primary/85">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-secondary-fixed" />
                  {tip}
                </li>
              ))}
            </ul>
            <LocalizedClientLink
              href="/account/orders"
              className="mt-space-lg inline-flex items-center gap-1 self-start font-label-md text-label-md font-semibold text-on-primary underline-offset-4 hover:underline"
            >
              Go to my orders
              <ArrowRightIcon aria-hidden className="size-4" />
            </LocalizedClientLink>
          </div>
        </div>
      </section>

      {/* Self-serve help */}
      <section className="mx-auto w-full max-w-[1440px] px-margin-mobile pb-space-xl md:px-margin">
        <div className="rounded-xl bg-surface-container p-space-lg md:p-space-xl">
          <div className="mb-space-lg max-w-2xl">
            <span className="mb-1 block font-label-caps text-label-caps uppercase tracking-widest text-secondary">Help centre</span>
            <h2 className="font-headline-xl text-[clamp(2rem,4vw,2.75rem)] text-primary">Find it yourself</h2>
          </div>
          <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {help.map(({ icon: Icon, title, body, href }) => (
              <li key={title}>
                <LocalizedClientLink
                  href={href}
                  className="group flex h-full flex-col gap-space-xs rounded-lg bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md"
                >
                  <Icon aria-hidden className="size-[22px] text-secondary" />
                  <span className="mt-space-xs font-label-md text-label-md font-semibold text-primary">{title}</span>
                  <span className="font-body-sm text-body-sm leading-snug text-on-surface-variant">{body}</span>
                  <ArrowRightIcon aria-hidden className="mt-auto size-4 text-on-surface-variant transition-transform group-hover:translate-x-0.5" />
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
