"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { formatMoney } from "@/components/store/money"
import { cn } from "@/lib/utils"
import { indexedCurrency, priceAttribute } from "@lib/search-client"
import {
  CATEGORY_ATTRIBUTE,
  LABELS_ATTRIBUTE,
  OPTION_VALUES_ATTRIBUTE,
} from "@modules/store/components/store-refinements/attributes"
import { useCallback, useEffect, useState } from "react"
import { useRange, useRefinementList, useToggleRefinement } from "react-instantsearch"

const SORT_BY_COUNT: ("count:desc" | "name:asc")[] = ["count:desc", "name:asc"]
const SORT_BY_NAME: "name:asc"[] = ["name:asc"]

const LABEL_NAMES: Record<string, string> = {
  "new-arrival": "New arrival",
  bestseller: "Bestseller",
}

function CheckList({
  attribute,
  format,
  exclude = [],
}: {
  attribute: string
  format?: (v: string) => string
  exclude?: string[]
}) {
  // InstantSearch re-creates the widget when this function changes identity,
  // so it must be stable or the list re-renders forever.
  const excluded = exclude.join("|")
  const transformItems = useCallback(
    <T extends { value: string }>(list: T[]) =>
      list.filter((item) => !excluded.split("|").includes(item.value)),
    [excluded]
  )
  const { items, refine } = useRefinementList({
    attribute,
    limit: 30,
    sortBy: SORT_BY_COUNT,
    transformItems,
  })
  return (
    // Rows of at least 32px keep each 18px checkbox inside the 24px target
    // spacing WCAG 2.2 (2.5.8) asks for.
    <ul className="flex flex-col pt-1">
      {items.map((item) => {
        const id = `${attribute}-${item.value}`
        return (
          <li key={item.value} className="flex min-h-8 items-center gap-2.5">
            <Checkbox
              id={id}
              checked={item.isRefined}
              onCheckedChange={() => refine(item.value)}
              data-testid={`refinement-${attribute}`}
            />
            <label htmlFor={id} className="flex-1 cursor-pointer text-sm">
              {format ? format(item.label) : item.label}
            </label>
            <span className="text-xs tabular-nums text-muted-foreground">{item.count}</span>
          </li>
        )
      })}
    </ul>
  )
}

function OptionGroups() {
  const { items, refine } = useRefinementList({
    attribute: OPTION_VALUES_ATTRIBUTE,
    limit: 200,
    sortBy: SORT_BY_NAME,
    operator: "and",
  })
  const groups = new Map<string, typeof items>()
  for (const item of items) {
    const at = item.label.indexOf(":")
    if (at < 1) continue
    const title = item.label.slice(0, at)
    groups.set(title, [...(groups.get(title) ?? []), item])
  }

  return (
    <>
      {[...groups.entries()].map(([title, values]) => (
        <AccordionItem key={title} value={`option-${title}`}>
          <AccordionTrigger>{title}</AccordionTrigger>
          <AccordionContent className="h-auto">
            <div className="flex flex-wrap gap-2">
              {values.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => refine(v.value)}
                  aria-pressed={v.isRefined}
                  className={cn(
                    "h-9 min-w-11 border px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                    v.isRefined
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground"
                  )}
                  data-testid="option-refinement"
                >
                  {v.label.slice(v.label.indexOf(":") + 1)}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </>
  )
}

function PriceFilter({ currencyCode }: { currencyCode: string }) {
  const { start, range, canRefine, refine } = useRange({ attribute: priceAttribute("min_price", currencyCode) })
  const min = Math.floor(range.min ?? 0)
  const max = Math.ceil(range.max ?? 0)
  const from = Number.isFinite(start[0]) ? (start[0] as number) : min
  const to = Number.isFinite(start[1]) ? (start[1] as number) : max
  const [value, setValue] = useState([from, to])
  const currency = indexedCurrency(currencyCode)

  useEffect(() => setValue([from, to]), [from, to])

  if (!canRefine || min >= max) return null

  return (
    <AccordionItem value="price">
      <AccordionTrigger>Price</AccordionTrigger>
      <AccordionContent className="h-auto">
        <div className="flex flex-col gap-4 px-3 pt-4 pb-2">
          <Slider
            value={value}
            min={min}
            max={max}
            step={1}
            onValueChange={setValue}
            onValueCommit={(v) => refine([v[0], v[1]])}
            aria-label="Price range"
            data-testid="price-range"
          />
          <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
            <span>{formatMoney(value[0], currency)}</span>
            <span>{formatMoney(value[1], currency)}</span>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

function OnSale({ currencyCode }: { currencyCode: string }) {
  const { value, refine, canRefine } = useToggleRefinement({ attribute: priceAttribute("on_sale", currencyCode), on: true })
  if (!canRefine) return null
  return (
    <div className="flex items-center gap-2.5 border-b py-4">
      <Checkbox id="on-sale" checked={value.isRefined} onCheckedChange={() => refine(value)} data-testid="on-sale-toggle" />
      <label htmlFor="on-sale" className="cursor-pointer text-sm">On sale only</label>
    </div>
  )
}

/** All facet filters, driven by the product search index. */
export function Filters({ currencyCode, showCategories }: { currencyCode: string; showCategories: boolean }) {
  return (
    <div className="flex flex-col">
      <OnSale currencyCode={currencyCode} />
      <Accordion type="multiple" defaultValue={["category", "price", "option-Size", "labels"]}>
        {showCategories && (
          <AccordionItem value="category">
            <AccordionTrigger>Category</AccordionTrigger>
            <AccordionContent className="h-auto">
              <CheckList attribute={CATEGORY_ATTRIBUTE} />
            </AccordionContent>
          </AccordionItem>
        )}
        <OptionGroups />
        <PriceFilter currencyCode={currencyCode} />
        <AccordionItem value="labels">
          <AccordionTrigger>Labels</AccordionTrigger>
          <AccordionContent className="h-auto">
            {/* A "sale" tag without a lower price would mislead; real discounts use "On sale only". */}
            <CheckList attribute={LABELS_ATTRIBUTE} format={(v) => LABEL_NAMES[v] ?? v.charAt(0).toUpperCase() + v.slice(1)} exclude={["sale"]} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
