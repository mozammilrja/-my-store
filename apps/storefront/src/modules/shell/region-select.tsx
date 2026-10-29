"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateRegion } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useParams, usePathname } from "next/navigation"
import { useMemo, useTransition } from "react"

type CountryOption = { country: string; label: string; currency: string }

/** Lets the shopper change the country they shop and ship in. */
export function RegionSelect({
  regions,
  id = "region-select",
}: {
  regions: HttpTypes.StoreRegion[]
  id?: string
}) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  const options = useMemo(
    () =>
      regions
        .flatMap((region) =>
          (region.countries ?? []).map((c) => ({
            country: c.iso_2 ?? "",
            label: c.display_name ?? c.iso_2?.toUpperCase() ?? "",
            currency: region.currency_code.toUpperCase(),
          }))
        )
        .filter((o): o is CountryOption => Boolean(o.country))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [regions]
  )

  const currentPath = pathname.split(`/${countryCode}`)[1] ?? ""

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Shipping to
      </label>
      <Select
        value={countryCode}
        disabled={pending}
        onValueChange={(country) =>
          startTransition(() => updateRegion(country, currentPath))
        }
      >
        <SelectTrigger id={id} size="sm" className="w-56" data-testid="region-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.country} value={o.country}>
              {o.label} <span className="text-muted-foreground">({o.currency})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
