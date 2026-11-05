"use client"

import { useParams } from "next/navigation"

/** A header search box that submits to the real /<country>/search page. */
export function SearchField({
  className,
  iconClassName,
  inputClassName,
  placeholder,
  kbd = false,
}: {
  className: string
  iconClassName: string
  inputClassName: string
  placeholder: string
  kbd?: boolean
}) {
  const { countryCode } = useParams<{ countryCode?: string }>()
  return (
    <form action={`/${countryCode ?? "in"}/search`} role="search" className={className}>
      <span aria-hidden className={`material-symbols-outlined ${iconClassName}`}>search</span>
      <input name="q" type="search" aria-label="Search the catalog" className={inputClassName} placeholder={placeholder} />
      {kbd && (
        <kbd className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">⌘K</kbd>
      )}
    </form>
  )
}
