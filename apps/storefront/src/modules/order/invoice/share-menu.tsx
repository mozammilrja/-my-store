"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

type Item = { label: string; icon: string; href: string; newTab?: boolean; testId: string }

/**
 * The invoice's "Email Dispatch" and "Share" buttons. A bare `mailto:` link
 * does nothing on machines without a desktop mail app, and desktop browsers
 * rarely have a share sheet, so each button opens a small menu of ways that
 * work everywhere (webmail, WhatsApp, the device's apps) plus "Copy link",
 * which always confirms, and falls back to a selectable field when the
 * clipboard is blocked.
 */
export function InvoiceShareMenu({
  kind,
  url,
  subject,
  body,
  to = "",
  className,
  children,
  testId,
}: {
  kind: "email" | "share"
  url: string
  subject: string
  body: string
  to?: string
  className: string
  children: ReactNode
  testId: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<"ok" | "manual" | null>(null)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after hydration
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function")
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const enc = encodeURIComponent
  const emailItems: Item[] = [
    { label: "Gmail", icon: "mail", href: `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to)}&su=${enc(subject)}&body=${enc(body)}`, newTab: true, testId: `${testId}-gmail` },
    { label: "Outlook.com", icon: "alternate_email", href: `https://outlook.live.com/mail/0/deeplink/compose?to=${enc(to)}&subject=${enc(subject)}&body=${enc(body)}`, newTab: true, testId: `${testId}-outlook` },
    { label: "Email app", icon: "forward_to_inbox", href: `mailto:${to}?subject=${enc(subject)}&body=${enc(body)}`, testId: `${testId}-mailto` },
  ]
  const shareItems: Item[] = [
    { label: "WhatsApp", icon: "chat", href: `https://wa.me/?text=${enc(`${subject}: ${url}`)}`, newTab: true, testId: `${testId}-whatsapp` },
    // No email entry here: the separate "Email Dispatch" button covers email.
  ]
  const items = kind === "email" ? emailItems : shareItems

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied("ok")
      setTimeout(() => setCopied(null), 2500)
    } catch {
      setCopied("manual")
    }
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ title: subject, text: subject, url })
      setOpen(false)
    } catch {
      // Dismissing the share sheet is not an error.
    }
  }

  return (
    <div ref={root} className="relative print:hidden">
      <button
        type="button"
        className={`cursor-pointer ${className}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
          setCopied(null)
        }}
        data-testid={testId}
        title={kind === "email" ? "Email this invoice" : "Share invoice link"}
        aria-label={kind === "email" ? undefined : "Share invoice link"}
      >
        {children}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 w-64 bg-surface-container-lowest rounded-lg shadow-lg ring-1 ring-surface-container-high p-1.5 flex flex-col"
        >
          {kind === "share" && canNativeShare && (
            <button type="button" role="menuitem" onClick={nativeShare} className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-surface-container-low text-left font-label-md text-label-md text-on-surface cursor-pointer">
              <span aria-hidden className="material-symbols-outlined text-[18px] text-on-surface-variant">ios_share</span>
              Share via device…
            </button>
          )}
          {items.map((it) => (
            <a
              key={it.label}
              role="menuitem"
              href={it.href}
              target={it.newTab ? "_blank" : undefined}
              rel={it.newTab ? "noopener noreferrer" : undefined}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-surface-container-low font-label-md text-label-md text-on-surface"
              data-testid={it.testId}
            >
              <span aria-hidden className="material-symbols-outlined text-[18px] text-on-surface-variant">{it.icon}</span>
              {it.label}
            </a>
          ))}
          <button type="button" role="menuitem" onClick={copy} className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-surface-container-low text-left font-label-md text-label-md text-on-surface cursor-pointer" data-testid={`${testId}-copy`}>
            <span aria-hidden className="material-symbols-outlined text-[18px] text-on-surface-variant">{copied === "ok" ? "done" : "link"}</span>
            {copied === "ok" ? "Link copied" : "Copy invoice link"}
          </button>
          {copied === "manual" && (
            <div className="px-3 pb-2 pt-1">
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">Copying is blocked here. Select the link and copy it:</p>
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                autoFocus
                aria-label="Invoice link"
                className="w-full h-9 px-2 rounded bg-surface-container-low font-mono text-[11px] text-on-surface"
              />
            </div>
          )}
        </div>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {copied === "ok" ? "Invoice link copied to clipboard" : ""}
      </span>
    </div>
  )
}
