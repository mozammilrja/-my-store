"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type StoreSelectOption = {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

export type StoreSelectGroup = {
  label: React.ReactNode
  options: StoreSelectOption[]
}

/**
 * Trigger looks used across the store.
 * - field: a form control, sized and coloured like the store's h-11 inputs.
 * - pill: a compact filter or sort control in a toolbar.
 * - inline: no chrome of its own, for a select sitting inside another control.
 */
export type StoreSelectVariant = "field" | "pill" | "inline"

const TRIGGER: Record<StoreSelectVariant, string> = {
  field:
    "h-11 data-[size=sm]:h-10 data-[size=default]:h-11 w-full gap-2 rounded border border-surface-container-high bg-surface-container-low px-3.5 text-on-surface transition-colors hover:bg-surface-container focus-visible:border-primary focus-visible:bg-surface-container-lowest focus-visible:ring-2 focus-visible:ring-primary/15 aria-invalid:border-error aria-invalid:focus-visible:ring-error/20 data-placeholder:text-on-surface-variant/60",
  pill:
    "h-11 data-[size=sm]:h-10 data-[size=default]:h-11 gap-2 rounded-lg border border-surface-container-high bg-surface-container-low px-3.5 text-on-surface transition-colors hover:bg-surface-container focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15",
  inline:
    "h-auto data-[size=sm]:h-auto data-[size=default]:h-auto gap-1.5 rounded border-0 bg-transparent px-0 py-0 text-on-surface focus-visible:ring-2 focus-visible:ring-primary/20",
}

/** Typography sits on the value span so it is not fighting the trigger's own text-sm. */
const VALUE: Record<StoreSelectVariant, string> = {
  field: "font-body-sm text-body-sm",
  pill: "font-label-sm text-label-sm uppercase",
  inline: "font-label-sm text-xs",
}

/**
 * Option typography, aimed at the item's text span (its last child) so it
 * wins over the item's own text-sm. Long labels wrap on a phone.
 */
const ITEM_TEXT: Record<StoreSelectVariant, string> = {
  field: "[&>span:last-child]:font-body-sm [&>span:last-child]:text-body-sm [&>span:last-child]:whitespace-normal",
  pill: "[&>span:last-child]:font-label-sm [&>span:last-child]:text-label-sm [&>span:last-child]:whitespace-normal",
  inline: "[&>span:last-child]:font-label-sm [&>span:last-child]:text-xs [&>span:last-child]:whitespace-normal",
}

export type StoreSelectProps = {
  options?: StoreSelectOption[]
  groups?: StoreSelectGroup[]
  /** Controlled value; pair with onValueChange. */
  value?: string
  /** Uncontrolled initial value. */
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** With a name, Radix renders a hidden native select so FormData carries the value. */
  name?: string
  form?: string
  autoComplete?: string
  required?: boolean
  disabled?: boolean
  placeholder?: React.ReactNode
  id?: string
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  "data-testid"?: string
  variant?: StoreSelectVariant
  size?: "sm" | "default"
  /** Extra trigger classes, for the spot's own width, radius or surface. */
  className?: string
  valueClassName?: string
  contentClassName?: string
  /** Rendered inside the trigger before the value, e.g. a "Sort by:" prefix. */
  leading?: React.ReactNode
  align?: "start" | "center" | "end"
  /** Stops click, pointer and key events (portalled list included) reaching a clickable parent. */
  stopPropagation?: boolean
}

export function StoreSelect({
  options,
  groups,
  value,
  defaultValue,
  onValueChange,
  name,
  form,
  autoComplete,
  required,
  disabled,
  placeholder,
  id,
  variant = "field",
  size = "default",
  className,
  valueClassName,
  contentClassName,
  leading,
  align = "start",
  stopPropagation = false,
  ...aria
}: StoreSelectProps) {
  const itemClass = cn(
    "rounded-sm py-2.5 pr-8 pl-3 text-on-surface focus:bg-surface-container-low focus:text-on-surface data-[state=checked]:font-semibold",
    ITEM_TEXT[variant]
  )

  // Children stay plain text: Radix copies the chosen item's text into the
  // trigger, where the variant's value typography takes over.
  const renderItems = (list: StoreSelectOption[]) =>
    list.map((o) => (
      <SelectItem key={o.value} value={o.value} disabled={o.disabled} className={itemClass}>
        {o.label}
      </SelectItem>
    ))

  const select = (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      name={name}
      form={form}
      autoComplete={autoComplete}
      required={required}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-label={aria["aria-label"]}
        aria-labelledby={aria["aria-labelledby"]}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={aria["aria-invalid"] || undefined}
        aria-required={required || undefined}
        data-testid={aria["data-testid"]}
        className={cn(
          "cursor-pointer outline-none disabled:cursor-not-allowed [&>svg]:text-on-surface-variant",
          TRIGGER[variant],
          className
        )}
      >
        {leading}
        <SelectValue placeholder={placeholder} className={cn(VALUE[variant], valueClassName)} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={4}
        align={align}
        className={cn(
          "z-[70] max-h-[min(20rem,var(--radix-select-content-available-height))] max-w-[calc(100vw-1rem)] min-w-(--radix-select-trigger-width) rounded border border-surface-container-high bg-surface-container-lowest p-1 text-on-surface shadow-lg ring-0",
          contentClassName
        )}
      >
        {groups
          ? groups.map((g, i) => (
              <SelectGroup key={i} className="p-0">
                <SelectLabel className="px-3 pt-2 pb-1 text-on-surface-variant">{g.label}</SelectLabel>
                {renderItems(g.options)}
              </SelectGroup>
            ))
          : renderItems(options ?? [])}
      </SelectContent>
    </Select>
  )

  if (!stopPropagation) return select

  // React events bubble through portals, so a select nested in a clickable
  // parent (the search bar) must keep its trigger and list events to itself.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <span className="contents" onClick={stop} onPointerDown={stop} onKeyDown={stop}>
      {select}
    </span>
  )
}

export default StoreSelect
