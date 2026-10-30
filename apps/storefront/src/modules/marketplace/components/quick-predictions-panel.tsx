"use client"

import { SearchIcon, SparklesIcon, TrendingUpIcon } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const FEATURED_HOUSES = [
  "Everwear Studio",
  "Aurum Atelier",
  "Heritage Loom 1984",
  "Kashmiri Botanics",
]

const PREDICTIONS = [
  {
    icon: SearchIcon,
    title: "Mulberry Silk Dresses",
    subtitle: "in Women / Western Evening",
    count: "64 items",
    href: "/search?q=Silk+Dress",
  },
  {
    icon: SparklesIcon,
    title: "Chanderi Zari Dupatta",
    subtitle: "in Indian Festive / Handloom",
    count: "112 items",
    href: "/search?q=Chanderi",
  },
  {
    icon: TrendingUpIcon,
    title: "Structured Linen Overshirts",
    subtitle: "in Men / Summer Essentials",
    count: "48 items",
    href: "/search?q=Linen+Shirt",
  },
]

export function QuickPredictionsPanel({ visible = true }: { visible?: boolean }) {
  if (!visible) return null

  return (
    <div
      className="relative w-full z-20 bg-surface-container-low/40 border-b border-border/60 py-4 px-margin-mobile md:px-margin transition-all"
      id="search-autocomplete-panel"
    >
      <div className="max-w-[1440px] mx-auto flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-foreground">
            <SparklesIcon className="size-4 text-secondary" />
            <span className="font-label-caps text-xs uppercase tracking-wider font-bold">
              Trending Curations &amp; Predictions
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="font-label-caps text-[10px] text-muted-foreground uppercase tracking-wider shrink-0 font-semibold">
              Curated Ateliers:
            </span>
            {FEATURED_HOUSES.map((house, idx) => (
              <LocalizedClientLink
                key={idx}
                href={`/search?q=${encodeURIComponent(house)}`}
                className="px-2.5 py-1 rounded-full bg-surface-container-lowest border border-border/60 text-foreground font-label-caps text-[10px] font-bold uppercase tracking-wider hover:border-foreground transition-colors shrink-0 shadow-2xs"
              >
                {house}
              </LocalizedClientLink>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PREDICTIONS.map((item, idx) => {
            const Icon = item.icon
            return (
              <LocalizedClientLink
                key={idx}
                href={item.href}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-border/60 hover:border-foreground/30 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-surface-container-low flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-sm text-xs text-foreground font-semibold group-hover:text-secondary transition-colors truncate">
                      {item.title}
                    </p>
                    <span className="font-body-sm text-[11px] text-muted-foreground truncate block">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
                <span className="font-label-caps text-[10px] text-muted-foreground bg-surface-container-low px-2 py-0.5 rounded font-bold shrink-0 ml-2">
                  {item.count}
                </span>
              </LocalizedClientLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}
