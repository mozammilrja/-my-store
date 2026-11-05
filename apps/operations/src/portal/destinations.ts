import type { Area } from "./session"

/*
 * Every page a person can open, by area, for the quick switcher and the
 * breadcrumbs. The admin's own modules come from its route table (routes.jsx);
 * the areas' pages are listed here once.
 */

export type Destination = { to: string; label: string; area: Area; keywords?: string }

export const AREA_HOME: Record<Area, string> = { admin: "/admin", warehouse: "/warehouse", delivery: "/delivery", seller: "/seller" }

export const AREA_PAGES: Record<Exclude<Area, "admin">, Destination[]> = {
  warehouse: [
    { to: "/warehouse", label: "Orders", area: "warehouse", keywords: "dashboard queue pick pack incoming" },
    { to: "/warehouse/dispatch", label: "Dispatch", area: "warehouse", keywords: "manifest courier handover dock" },
    { to: "/warehouse/stock", label: "Stock", area: "warehouse", keywords: "inventory bin receive adjust transfer" },
    { to: "/warehouse/returns", label: "Returns", area: "warehouse", keywords: "inspection rto restock" },
  ],
  delivery: [
    { to: "/delivery", label: "Today", area: "delivery", keywords: "route offers deliveries" },
    { to: "/delivery/cash", label: "Cash", area: "delivery", keywords: "cod remittance" },
    { to: "/delivery/earnings", label: "Earnings", area: "delivery", keywords: "payout" },
    { to: "/delivery/profile", label: "Profile", area: "delivery", keywords: "documents vehicle" },
  ],
  seller: [
    { to: "/seller", label: "Overview", area: "seller", keywords: "dashboard" },
    { to: "/seller/listings", label: "Listings", area: "seller", keywords: "products catalogue" },
    { to: "/seller/stock", label: "Stock", area: "seller", keywords: "inventory variants" },
    { to: "/seller/orders", label: "Orders", area: "seller", keywords: "pack dispatch" },
    { to: "/seller/sales", label: "Sales", area: "seller" },
    { to: "/seller/returns", label: "Returns", area: "seller" },
    { to: "/seller/payments", label: "Payments", area: "seller", keywords: "settlements commission payout" },
    { to: "/seller/reports", label: "Performance", area: "seller", keywords: "reports" },
  ],
}

/** The label of the page at `pathname` within its area, for breadcrumbs. */
export function pageLabel(pathname: string, adminModules: { path: string; label: string }[]): string | null {
  const [, area, page, sub] = pathname.split("/")
  if (area === "admin") return adminModules.find((m) => m.path === page)?.label ?? null
  if (area === "account") return "Account & security"
  const pages = AREA_PAGES[area as Exclude<Area, "admin">]
  if (!pages) return null
  if (!page) return pages[0]?.label ?? null
  const known = pages.find((p) => p.to === `/${area}/${page}`)
  if (known) return known.label
  // Detail pages: name the record kind.
  if (area === "warehouse" && page === "fulfilments") return sub ? "Order" : null
  if (area === "delivery" && page === "tasks") return "Delivery"
  if (area === "delivery" && page === "register") return "Join"
  if (area === "seller" && page === "register") return "Apply"
  return null
}
