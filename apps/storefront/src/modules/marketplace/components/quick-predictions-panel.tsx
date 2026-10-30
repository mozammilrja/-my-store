"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

const FEATURED_HOUSES = [
  "Everwear Studio",
  "Aurum Atelier",
  "Heritage Loom 1984",
  "Kashmiri Botanics",
]

const PREDICTIONS = [
  {
    icon: "search",
    title: "Mulberry Silk Dresses",
    subtitle: "in Women / Western Evening",
    count: "64 items",
    href: "/store",
  },
  {
    icon: "auto_awesome",
    title: "Chanderi Zari Dupatta",
    subtitle: "in Indian Festive / Handloom",
    count: "112 items",
    href: "/store",
  },
  {
    icon: "trending_up",
    title: "Structured Linen Overshirts",
    subtitle: "in Men / Summer Essentials",
    count: "48 items",
    href: "/store",
  },
]

export function QuickPredictionsPanel({ visible = true }: { visible?: boolean }) {
  if (!visible) return null

  return (
    <div
      className="relative w-full z-30 bg-surface-container-low shadow-[0_16px_32px_-8px_rgba(27,28,27,0.08)] py-6 px-margin-mobile md:px-margin transition-all"
      id="search-autocomplete-panel"
    >
      <div className="max-w-[1440px] mx-auto flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px] text-secondary">flare</span>
            <span className="font-label-caps text-label-caps uppercase tracking-wider font-semibold text-on-surface">
              Omnichannel Quick Predictions
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase shrink-0">
              Featured Houses:
            </span>
            {FEATURED_HOUSES.map((house, idx) => (
              <LocalizedClientLink
                key={idx}
                href="/store"
                className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-on-surface font-label-caps text-[11px] font-medium shadow-sm shrink-0 cursor-pointer hover:bg-surface-container transition-colors"
              >
                {house}
              </LocalizedClientLink>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PREDICTIONS.map((item, idx) => (
            <LocalizedClientLink
              key={idx}
              href={item.href}
              className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest hover:bg-surface transition-colors cursor-pointer group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface font-medium group-hover:text-secondary transition-colors">
                    {item.title}
                  </p>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    {item.subtitle}
                  </span>
                </div>
              </div>
              <span className="font-label-caps text-[10px] text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">
                {item.count}
              </span>
            </LocalizedClientLink>
          ))}
        </div>
      </div>
    </div>
  )
}
