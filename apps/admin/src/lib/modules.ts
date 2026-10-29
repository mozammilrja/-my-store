import {
  ArrowLeftRight,
  Banknote,
  FolderTree,
  LayoutDashboard,
  LineChart,
  Package,
  PlaneTakeoff,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react"
import { formatCount } from "@/lib/format"
import type { ModulePlan } from "@/routes/module-placeholder"

export type Attention = { toShip: number; toCollect: number; lowStock: number }

export type NavEntry = {
  label: string
  to: string
  icon: LucideIcon
  /** False while the module is a placeholder waiting on its endpoints. */
  ready: boolean
  badge?: (attention: Attention) => { text: string; tone: "warning" | "info" } | null
}

/** The admin's five areas, in the order the design lays them out. */
export const NAV: { label: string; items: NavEntry[] }[] = [
  {
    label: "Core",
    items: [
      { label: "Overview", to: "/", icon: LayoutDashboard, ready: true },
      { label: "Analytics", to: "/analytics", icon: LineChart, ready: false },
    ],
  },
  {
    label: "Catalog & inventory",
    items: [
      {
        label: "Products",
        to: "/products",
        icon: Package,
        ready: true,
        badge: ({ lowStock }) =>
          lowStock ? { text: `${formatCount(lowStock)} low`, tone: "warning" } : null,
      },
      { label: "Catalog", to: "/catalog", icon: FolderTree, ready: true },
      { label: "Inventory", to: "/inventory", icon: Warehouse, ready: false },
      { label: "Suppliers", to: "/suppliers", icon: Truck, ready: false },
    ],
  },
  {
    label: "Fulfillment & orders",
    items: [
      {
        label: "Orders",
        to: "/orders",
        icon: ShoppingBag,
        ready: true,
        badge: ({ toShip }) =>
          toShip ? { text: `${formatCount(toShip)} to ship`, tone: "info" } : null,
      },
      { label: "Returns", to: "/returns", icon: ArrowLeftRight, ready: false },
      { label: "Shipments", to: "/shipments", icon: PlaneTakeoff, ready: false },
    ],
  },
  {
    label: "Finance & compliance",
    items: [
      { label: "Tax & invoices", to: "/invoices", icon: ReceiptText, ready: false },
      { label: "Payments", to: "/payments", icon: Wallet, ready: false },
      { label: "Credit notes", to: "/credit-notes", icon: Banknote, ready: false },
    ],
  },
  {
    label: "Customers & admin",
    items: [
      { label: "Customers", to: "/customers", icon: Users, ready: true },
      { label: "Promotions", to: "/promotions", icon: Tag, ready: true },
      { label: "Users & roles", to: "/users", icon: ShieldCheck, ready: true },
      { label: "Settings", to: "/settings", icon: Settings, ready: true },
    ],
  },
]

/** What each unbuilt module needs, stated on its own page. */
export const MODULE_PLANS: Record<string, ModulePlan> = {
  analytics: {
    eyebrow: "Core",
    title: "Analytics & reports",
    description: "Deeper reporting than the overview: cohorts, products, regions.",
    capabilities: [
      "Aggregation endpoints so reports are computed in the database, not the browser",
      "Saved date ranges and comparisons beyond the overview's 7, 30 and 90 days",
      "Exports of any report as CSV",
    ],
    nearest: { to: "/", label: "Use the overview" },
    icon: LineChart,
  },
  inventory: {
    eyebrow: "Catalog & inventory",
    title: "Inventory & warehouses",
    description: "Stock across every variant, and the locations that hold it.",
    capabilities: [
      "A variant-level stock list across the whole catalog, searchable by SKU",
      "Audited stock adjustments with a reason, applied in a transaction",
      "Stock per location once warehouses exist, instead of one global count",
    ],
    nearest: { to: "/products", label: "Edit stock on a product" },
    icon: Warehouse,
  },
  suppliers: {
    eyebrow: "Catalog & inventory",
    title: "Purchase orders & suppliers",
    description: "Who you buy from, what is on order, and what has arrived.",
    capabilities: [
      "A supplier record with contacts, lead times and payment terms",
      "Purchase orders that raise expected stock and receive against it",
      "Receiving that moves stock in the same transaction as the order line",
    ],
    icon: Truck,
  },
  returns: {
    eyebrow: "Fulfillment & orders",
    title: "Returns & exchanges",
    description: "Return requests, inspection and what happens to the stock.",
    capabilities: [
      "A return raised against an order's own line items",
      "States from requested through received to resolved, each one checked",
      "Restocking on receipt, and a refund or exchange recorded against the order",
    ],
    nearest: { to: "/orders", label: "Mark an order returned" },
    icon: ArrowLeftRight,
  },
  shipments: {
    eyebrow: "Fulfillment & orders",
    title: "Shipments & dispatch",
    description: "Carriers, tracking numbers and what left the building.",
    capabilities: [
      "A shipment per order with carrier, tracking number and dispatch time",
      "Partial shipments, so one order can leave in more than one parcel",
      "Delivery state fed back onto the order's fulfillment status",
    ],
    nearest: { to: "/orders", label: "Mark an order shipped" },
    icon: PlaneTakeoff,
  },
  invoices: {
    eyebrow: "Finance & compliance",
    title: "Tax & invoices",
    description: "Tax rules per region and the invoices orders produce.",
    capabilities: [
      "Tax rules held per region, beyond the single rate a region carries now",
      "A numbered invoice per order, immutable once issued",
      "A tax summary for a period, exportable for filing",
    ],
    icon: ReceiptText,
  },
  payments: {
    eyebrow: "Finance & compliance",
    title: "Payments & reconciliation",
    description: "What was collected, against what was owed.",
    capabilities: [
      "Payment records against an order, instead of one status field",
      "More than cash on delivery, which is the only method the API takes today",
      "Reconciliation of collected against expected, per day and per method",
    ],
    nearest: { to: "/orders", label: "Mark an order paid" },
    icon: Wallet,
  },
  "credit-notes": {
    eyebrow: "Finance & compliance",
    title: "Credit notes & refunds",
    description: "Money owed back, and the document that records it.",
    capabilities: [
      "A credit note raised from a return or a cancellation",
      "Refunds recorded against the original payment",
      "A running balance per customer for part-refunded orders",
    ],
    icon: Banknote,
  },
}
