import { useMutation, useQuery } from "@tanstack/react-query"
import { useState, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/reui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, adminApi } from "@/lib/api"
import { toMinor } from "@/lib/format"
import type { NewPromotion } from "@/lib/types"

type Props = {
  trigger: ReactNode
  onCreated: () => void
}

const EMPTY = {
  code: "",
  type: "percentage" as "percentage" | "fixed",
  value: "",
  currency: "",
  usageLimit: "",
  startsAt: "",
  endsAt: "",
}

/** Creates one discount code. The API owns every rule; this only shapes the body. */
export const PromotionCreateDialog = ({ trigger, onCreated }: Props) => {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const regions = useQuery({
    queryKey: ["regions"],
    queryFn: async () => (await adminApi.regions()).regions,
    staleTime: 10 * 60_000,
  })
  const currencies = [...new Set((regions.data ?? []).map((region) => region.currency))]
  const currency = form.currency || currencies[0] || ""

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const create = useMutation({
    mutationFn: () => {
      const body: NewPromotion = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value:
          form.type === "percentage"
            ? Math.round(Number(form.value))
            : toMinor(form.value, currency),
        currency: form.type === "fixed" ? currency : null,
        active: true,
        usageLimit: form.usageLimit.trim() ? Math.round(Number(form.usageLimit)) : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      }
      return adminApi.createPromotion(body)
    },
    onSuccess: ({ promotion }) => {
      setError(null)
      setForm(EMPTY)
      setOpen(false)
      onCreated()
      toast.success(`${promotion.code} is live`)
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : "Could not create that code."),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    create.mutate()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A cancelled dialog should not keep a half-typed code or a stale error.
        if (!create.isPending) setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>New discount code</DialogTitle>
            <DialogDescription>
              Shoppers enter this at checkout. It goes live straight away.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Field>
              <FieldLabel htmlFor="promo-code">Code</FieldLabel>
              <Input
                id="promo-code"
                required
                autoComplete="off"
                placeholder="SPRING20"
                value={form.code}
                onChange={(event) => set("code", event.target.value.toUpperCase())}
              />
              <FieldDescription>
                3 to 32 letters, numbers, dashes or underscores.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="promo-type">Discount</FieldLabel>
              <Select
                value={form.type}
                onValueChange={(value) => set("type", value as "percentage" | "fixed")}
              >
                <SelectTrigger id="promo-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage off</SelectItem>
                  <SelectItem value="fixed">Fixed amount off</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="promo-value">
                {form.type === "percentage" ? "Percentage" : "Amount"}
              </FieldLabel>
              <Input
                id="promo-value"
                required
                inputMode="decimal"
                placeholder={form.type === "percentage" ? "20" : "10.00"}
                value={form.value}
                onChange={(event) => set("value", event.target.value)}
              />
              {form.type === "percentage" ? (
                <FieldDescription>Up to 100.</FieldDescription>
              ) : null}
            </Field>
            {form.type === "fixed" && currencies.length > 1 ? (
              <Field>
                <FieldLabel htmlFor="promo-currency">Currency</FieldLabel>
                <Select value={currency} onValueChange={(value) => set("currency", value)}>
                  <SelectTrigger id="promo-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="promo-limit">Usage limit</FieldLabel>
              <Input
                id="promo-limit"
                inputMode="numeric"
                placeholder="Unlimited"
                value={form.usageLimit}
                onChange={(event) => set("usageLimit", event.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="promo-starts">Starts</FieldLabel>
                <Input
                  id="promo-starts"
                  type="date"
                  value={form.startsAt}
                  onChange={(event) => set("startsAt", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="promo-ends">Ends</FieldLabel>
                <Input
                  id="promo-ends"
                  type="date"
                  value={form.endsAt}
                  onChange={(event) => set("endsAt", event.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={create.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Spinner /> : null}
              Create code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
