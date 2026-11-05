"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

const preferencesSchema = z.object({
  orderUpdates: z.boolean(),
  shippingAlerts: z.boolean(),
  exclusiveOffers: z.boolean(),
  securityAlerts: z.boolean(),
  channelEmail: z.boolean(),
  channelSms: z.boolean(),
  channelWhatsapp: z.boolean(),
})

type NotificationCategory = "all" | "orders" | "shipping" | "returns" | "offers" | "security"

type NotificationCard = {
  id: string
  category: "orders" | "shipping" | "returns" | "offers" | "security"
  categoryLabel: string
  timeAgo: string
  isUnread: boolean
  title: string
  description: string
  icon: string
  actionHref: string
  actionLabel: string
  actionIsPrimary?: boolean
}

const INITIAL_CARDS: NotificationCard[] = [
  {
    id: "notif-1",
    category: "orders",
    categoryLabel: "Orders",
    timeAgo: "10 mins ago",
    isUnread: true,
    title: "Order #EV-8842-IN Successfully Confirmed",
    description:
      "Your curation of Mulberry Silk Pleated Midi Dress and 1 other item has been securely registered. Our atelier artisans are currently reviewing your selection.",
    icon: "inventory_2",
    actionHref: "/account/orders",
    actionLabel: "View Order",
  },
  {
    id: "notif-2",
    category: "offers",
    categoryLabel: "Offers",
    timeAgo: "2 hours ago",
    isUnread: true,
    title: "Privilege Gold Perk: Mid-Season Preview Unlocked",
    description:
      "As an esteemed Privilege Gold member, enjoy exclusive early access to the upcoming Autumn Linen Curation with complimentary express delivery using code EVERSPRING.",
    icon: "workspace_premium",
    actionHref: "/store?sale=true",
    actionLabel: "Explore Edit",
    actionIsPrimary: true,
  },
  {
    id: "notif-3",
    category: "shipping",
    categoryLabel: "Shipping",
    timeAgo: "Yesterday at 4:15 PM",
    isUnread: false,
    title: "Your Package is Out for Delivery",
    description:
      "Consignment #AW-99201 dispatched via BlueDart Courier. Estimated arrival at your designated New Delhi residence by 6:00 PM today.",
    icon: "local_shipping",
    actionHref: "/account/track-orders",
    actionLabel: "Track Consignment",
  },
  {
    id: "notif-4",
    category: "returns",
    categoryLabel: "Returns & Refunds",
    timeAgo: "3 days ago",
    isUnread: false,
    title: "Refund Processed Successfully (₹2,100)",
    description:
      "The refund for your returned Structured Linen Blazer has been initiated to your original HDFC Bank Visa ending in 4092. Expect reflection within 2-4 business days.",
    icon: "published_with_changes",
    actionHref: "/account/returns",
    actionLabel: "View Receipt",
  },
  {
    id: "notif-5",
    category: "security",
    categoryLabel: "Account Security",
    timeAgo: "5 days ago",
    isUnread: false,
    title: "New Sign-in from macOS Safari (New Delhi, IN)",
    description:
      "We noticed a successful login to your Everwear Atelier account from a recognized device and location. If this was you, no action is required.",
    icon: "shield",
    actionHref: "/account/profile",
    actionLabel: "Review Activity",
  },
  {
    id: "notif-6",
    category: "orders",
    categoryLabel: "Orders",
    timeAgo: "1 week ago",
    isUnread: false,
    title: "Delivery Completed: Sculpted Boyfriend Blazer",
    description:
      "Delivered to your residence. 14-day complimentary doorstep exchanges and alteration pickups are active.",
    icon: "inventory_2",
    actionHref: "/account/orders",
    actionLabel: "View Order",
  },
]

export function NotificationsView() {
  const [cards, setCards] = useState<NotificationCard[]>(INITIAL_CARDS)
  const [activeTab, setActiveTab] = useState<NotificationCategory>("all")
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState({
    orderUpdates: true,
    shippingAlerts: true,
    exclusiveOffers: true,
    securityAlerts: true,
    channelEmail: true,
    channelSms: true,
    channelWhatsapp: false,
  })

  const markAllAsRead = () => {
    setCards((prev) => prev.map((c) => ({ ...c, isUnread: false })))
    toast.success("All communications marked as read")
  }

  const markAsRead = (id: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, isUnread: false } : c)))
    toast.success("Marked as read")
  }

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault()
    // Zod validation
    const result = preferencesSchema.safeParse(preferences)
    if (!result.success) {
      toast.error("Invalid notification preferences")
      return
    }
    toast.success("Notification preferences updated successfully")
    setShowPreferences(false)
  }

  const counts = {
    all: cards.length,
    orders: cards.filter((c) => c.category === "orders").length,
    shipping: cards.filter((c) => c.category === "shipping").length,
    returns: cards.filter((c) => c.category === "returns").length,
    offers: cards.filter((c) => c.category === "offers").length,
    security: cards.filter((c) => c.category === "security").length,
  }

  const displayedCards = cards.filter((c) =>
    activeTab === "all" ? true : c.category === activeTab
  )

  return (
    <div className="flex flex-col w-full" data-testid="notifications-view">
      {/* Header & Actions Toolbar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-xl pb-space-md border-b border-surface-container-high">
        <div>
          <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest block mb-1">
            Atelier Communications
          </span>
          <h1 className="font-headline-xl text-headline-xl text-on-surface uppercase">
            NOTIFICATIONS
          </h1>
        </div>
        <div className="flex items-center gap-space-md">
          <button
            type="button"
            onClick={markAllAsRead}
            className="h-11 px-5 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm rounded uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">done_all</span>
            Mark All as Read
          </button>
          <button
            type="button"
            onClick={() => setShowPreferences(true)}
            className="h-11 px-5 bg-primary hover:bg-inverse-surface text-on-primary font-label-sm text-label-sm rounded uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm cursor-pointer font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Preferences
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-space-md mb-space-lg no-scrollbar">
        {(
          [
            { key: "all", label: `All (${counts.all})` },
            { key: "orders", label: `Orders (${counts.orders})` },
            { key: "shipping", label: `Shipping (${counts.shipping})` },
            { key: "returns", label: `Returns & Refunds (${counts.returns})` },
            { key: "offers", label: `Offers (${counts.offers})` },
            { key: "security", label: `Account Security (${counts.security})` },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`h-9 px-4 rounded font-label-sm text-label-sm uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-primary text-on-primary font-semibold"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Notifications List Container */}
      <div className="flex flex-col gap-space-md" id="notifications-list">
        {displayedCards.length === 0 ? (
          <div className="p-space-xl bg-surface-container-lowest rounded-xl text-center border border-surface-container-high/60">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">
              notifications_off
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              No notifications found in this category.
            </p>
          </div>
        ) : (
          displayedCards.map((card) => (
            <div
              key={card.id}
              className={`bg-surface-container-lowest p-space-lg rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-md transition-all relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-surface-container-high/60 ${
                !card.isUnread ? "opacity-85" : ""
              }`}
            >
              {card.isUnread && (
                <div className="absolute top-0 left-0 bottom-1 w-1 bg-secondary" />
              )}
              <div className="flex items-start gap-space-md">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    card.isUnread
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {card.icon}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`font-label-caps text-label-caps uppercase tracking-wider ${
                        card.isUnread
                          ? "text-secondary font-bold"
                          : "text-on-surface-variant font-semibold"
                      }`}
                    >
                      {card.categoryLabel}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {card.timeAgo}
                    </span>
                    {card.isUnread && (
                      <span className="bg-secondary text-on-secondary font-label-caps text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        New
                      </span>
                    )}
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
                    {card.title}
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                    {card.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-surface-container-high">
                <LocalizedClientLink
                  href={card.actionHref}
                  className={`h-9 px-4 font-label-sm text-label-sm rounded uppercase tracking-wider transition-colors flex items-center justify-center font-medium ${
                    card.actionIsPrimary
                      ? "bg-primary hover:bg-inverse-surface text-on-primary shadow-xs"
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                  }`}
                >
                  {card.actionLabel}
                </LocalizedClientLink>
                {card.isUnread && (
                  <button
                    type="button"
                    onClick={() => markAsRead(card.id)}
                    className="h-9 w-9 bg-surface-container hover:bg-surface-container-high text-on-surface rounded flex items-center justify-center transition-colors cursor-pointer"
                    title="Mark as read"
                  >
                    <span className="material-symbols-outlined text-[18px]">done</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preferences Modal (Validated via Zod) */}
      {showPreferences && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-[0_20px_40px_-15px_rgba(24,24,27,0.2)] p-space-lg border border-surface-container-high/80">
            <div className="flex items-center justify-between pb-space-md mb-space-md border-b border-surface-container-high">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Notification Preferences
              </h3>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="text-outline hover:text-on-surface transition-colors p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="flex flex-col gap-4">
              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold tracking-wider">
                Event Categories
              </span>
              <label className="flex items-center justify-between text-body-sm text-on-surface cursor-pointer">
                <span>Order Placement &amp; Dispatch Updates</span>
                <input
                  type="checkbox"
                  checked={preferences.orderUpdates}
                  onChange={(e) =>
                    setPreferences({ ...preferences, orderUpdates: e.target.checked })
                  }
                  className="accent-primary size-4.5"
                />
              </label>
              <label className="flex items-center justify-between text-body-sm text-on-surface cursor-pointer">
                <span>Live Consignment &amp; Delivery Tracking</span>
                <input
                  type="checkbox"
                  checked={preferences.shippingAlerts}
                  onChange={(e) =>
                    setPreferences({ ...preferences, shippingAlerts: e.target.checked })
                  }
                  className="accent-primary size-4.5"
                />
              </label>
              <label className="flex items-center justify-between text-body-sm text-on-surface cursor-pointer">
                <span>Atelier Privilege Club Early Access</span>
                <input
                  type="checkbox"
                  checked={preferences.exclusiveOffers}
                  onChange={(e) =>
                    setPreferences({ ...preferences, exclusiveOffers: e.target.checked })
                  }
                  className="accent-primary size-4.5"
                />
              </label>
              <label className="flex items-center justify-between text-body-sm text-on-surface cursor-pointer">
                <span>Account Security &amp; Biometric Sessions</span>
                <input
                  type="checkbox"
                  checked={preferences.securityAlerts}
                  onChange={(e) =>
                    setPreferences({ ...preferences, securityAlerts: e.target.checked })
                  }
                  className="accent-primary size-4.5"
                />
              </label>

              <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold tracking-wider mt-2">
                Delivery Channels
              </span>
              <div className="grid grid-cols-3 gap-2">
                <label className="p-2.5 rounded bg-surface-container-low border border-surface-container-high text-xs flex items-center justify-between cursor-pointer">
                  <span>Email</span>
                  <input
                    type="checkbox"
                    checked={preferences.channelEmail}
                    onChange={(e) =>
                      setPreferences({ ...preferences, channelEmail: e.target.checked })
                    }
                    className="accent-primary"
                  />
                </label>
                <label className="p-2.5 rounded bg-surface-container-low border border-surface-container-high text-xs flex items-center justify-between cursor-pointer">
                  <span>SMS</span>
                  <input
                    type="checkbox"
                    checked={preferences.channelSms}
                    onChange={(e) =>
                      setPreferences({ ...preferences, channelSms: e.target.checked })
                    }
                    className="accent-primary"
                  />
                </label>
                <label className="p-2.5 rounded bg-surface-container-low border border-surface-container-high text-xs flex items-center justify-between cursor-pointer">
                  <span>WhatsApp</span>
                  <input
                    type="checkbox"
                    checked={preferences.channelWhatsapp}
                    onChange={(e) =>
                      setPreferences({ ...preferences, channelWhatsapp: e.target.checked })
                    }
                    className="accent-primary"
                  />
                </label>
              </div>

              <div className="pt-space-md flex items-center justify-end gap-3 border-t border-surface-container-high mt-2">
                <button
                  type="button"
                  onClick={() => setShowPreferences(false)}
                  className="h-10 px-5 bg-surface-container text-on-surface font-label-sm text-label-sm uppercase rounded hover:bg-surface-container-high transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 bg-primary text-on-primary font-label-sm text-label-sm uppercase rounded hover:bg-inverse-surface transition-colors font-medium shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
