"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React from "react"

/**
 * Persists the current country code in Next.js `<Link />`,
 * handling root routes, pre-localized routes, and fallback gracefully.
 */
export default function LocalizedClientLink({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode
  href: string
  className?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  passHref?: true
  [x: string]: unknown
}) {
  const params = useParams()
  const countryCode = (params?.countryCode as string) || "in"

  if (!href) {
    return <span {...(props as React.HTMLAttributes<HTMLSpanElement>)}>{children}</span>
  }

  // Pass through external URLs or anchors
  if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return (
      <a href={href} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    )
  }

  const cleanHref = href.startsWith("/") ? href : `/${href}`
  const target =
    cleanHref === "/"
      ? `/${countryCode}`
      : cleanHref.startsWith(`/${countryCode}/`) || cleanHref === `/${countryCode}`
        ? cleanHref
        : `/${countryCode}${cleanHref}`

  return (
    <Link href={target} {...props}>
      {children}
    </Link>
  )
}
