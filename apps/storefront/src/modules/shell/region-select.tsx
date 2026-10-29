"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Region } from "@lib/api/types"
import { changeRegion } from "@lib/data/shop"
import { useParams, usePathname } from "next/navigation"
import { useMemo, useTransition } from "react"

type CountryOption = { country: string; label: string; currency: string }

/** Lets the shopper change the country they shop and ship in. */
export function RegionSelect({
  regions,
  id = "region-select",
}: {
  regions: Region[]
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
            country: c.code,
            label: c.name || c.code.toUpperCase(),
            currency: region.currency.toUpperCase(),
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
          startTransition(() => changeRegion(country, currentPath))
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
