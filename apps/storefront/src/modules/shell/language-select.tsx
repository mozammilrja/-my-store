"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateLocale } from "@lib/data/locale-actions"
import type { Locale } from "@lib/data/locales"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

/** Shown only when the backend has translations enabled and locales configured. */
export function LanguageSelect({
  locales,
  current,
}: {
  locales: Locale[]
  current: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="language-select" className="text-xs text-muted-foreground">
        Language
      </label>
      <Select
        value={current ?? locales[0]?.code}
        disabled={pending}
        onValueChange={(code) =>
          startTransition(async () => {
            await updateLocale(code)
            router.refresh()
          })
        }
      >
        <SelectTrigger id="language-select" size="sm" className="w-56" data-testid="language-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
