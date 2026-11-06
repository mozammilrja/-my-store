"use client"

import { subscribeToNewsletter } from "@lib/data/newsletter"
import { useState, useTransition } from "react"

/** Footer newsletter form: same markup as the Stitch footers, saved through the API. */
export function NewsletterForm({
  source,
  className,
  inputClassName,
  buttonClassName,
  placeholder,
  label,
}: {
  source: string
  className: string
  inputClassName: string
  buttonClassName: string
  placeholder: string
  label: string
}) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, start] = useTransition()

  return (
    <div>
      <form
        className={className}
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const result = await subscribeToNewsletter(email, source)
            setStatus(result)
            if (result.ok) setEmail("")
          })
        }}
      >
        <input
          className={inputClassName}
          placeholder={placeholder}
          type="email"
          autoComplete="email"
          required
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className={buttonClassName} type="submit" disabled={pending}>
          {pending ? "…" : label}
        </button>
      </form>
      {status && (
        <p role="status" className={`mt-space-xs font-label-sm text-label-sm ${status.ok ? "text-on-surface-variant" : "text-error"}`}>
          {status.message}
        </p>
      )}
    </div>
  )
}
