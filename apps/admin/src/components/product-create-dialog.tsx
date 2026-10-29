import { useMutation, useQuery } from "@tanstack/react-query"
import { Plus, X } from "lucide-react"
import { useState, type FormEvent, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
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
import type { NewProduct, ProductStatus } from "@/lib/types"

/** The API builds one variant per option combination, and caps the product at 100. */
const MAX_OPTIONS = 3
const MAX_VARIANTS = 100

type OptionDraft = { title: string; values: string }

const valuesOf = (option: OptionDraft) =>
  option.values
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

const variantCount = (options: OptionDraft[]) =>
  options
    .filter((option) => option.title.trim() && valuesOf(option).length)
    .reduce((total, option) => total * new Set(valuesOf(option)).size, 1)

/**
 * Creates a product, then opens it. Options can only be set here: the edit page
 * changes existing variants but never adds one, which is what the API allows.
 */
export const ProductCreateDialog = ({ trigger }: { trigger: ReactNode }) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [handle, setHandle] = useState("")
  const [status, setStatus] = useState<ProductStatus>("draft")
  const [stock, setStock] = useState("0")
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [options, setOptions] = useState<OptionDraft[]>([])

  const regions = useQuery({
    queryKey: ["regions"],
    queryFn: async () => (await adminApi.regions()).regions,
    staleTime: 10 * 60_000,
  })
  const currencies = [...new Set((regions.data ?? []).map((region) => region.currency))]
  const variants = variantCount(options)
  const tooManyVariants = variants > MAX_VARIANTS

  const reset = () => {
    setTitle("")
    setHandle("")
    setStatus("draft")
    setStock("0")
    setPrices({})
    setOptions([])
    setError(null)
  }

  const create = useMutation({
    mutationFn: () => {
      const body: NewProduct = {
        title: title.trim(),
        status,
        ...(handle.trim() ? { handle: handle.trim() } : {}),
        prices: Object.fromEntries(
          Object.entries(prices)
            .filter(([, value]) => value.trim() !== "")
            .map(([currency, value]) => [currency, toMinor(value, currency)])
        ),
        stock: Math.round(Number(stock)) || 0,
        options: options
          .filter((option) => option.title.trim() && valuesOf(option).length)
          .map((option) => ({ title: option.title.trim(), values: valuesOf(option) })),
      }
      return adminApi.createProduct(body)
    },
    onSuccess: ({ product }) => {
      setOpen(false)
      reset()
      toast.success(`${product.title} created`)
      navigate(`/products/${product.id}`)
    },
    onError: (caught) =>
      setError(
        caught instanceof ApiError ? caught.message : "Could not create that product."
      ),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    create.mutate()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (create.isPending) return
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>New product</DialogTitle>
            <DialogDescription>
              Set the options now; prices and stock can be edited afterwards.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Field>
              <FieldLabel htmlFor="new-title">Title</FieldLabel>
              <Input
                id="new-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="new-status">Status</FieldLabel>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as ProductStatus)}
                >
                  <SelectTrigger id="new-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="new-handle">Handle</FieldLabel>
                <Input
                  id="new-handle"
                  placeholder="From the title"
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor={`new-price-${currencies[0] ?? "none"}`}>
                Starting price
              </FieldLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {currencies.map((currency, index) => (
                  <Input
                    key={currency}
                    id={`new-price-${currency}`}
                    required={index === 0}
                    inputMode="decimal"
                    placeholder={currency.toUpperCase()}
                    aria-label={`${currency.toUpperCase()} price`}
                    value={prices[currency] ?? ""}
                    onChange={(event) =>
                      setPrices((current) => ({
                        ...current,
                        [currency]: event.target.value,
                      }))
                    }
                  />
                ))}
              </div>
              <FieldDescription>
                Every variant starts at this price, per currency your regions sell in.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="new-stock">Starting stock</FieldLabel>
              <Input
                id="new-stock"
                inputMode="numeric"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
              />
              <FieldDescription>Per variant, not in total.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="new-option-0">Options</FieldLabel>
              <div className="flex flex-col gap-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      id={`new-option-${index}`}
                      className="w-28"
                      placeholder="Size"
                      aria-label={`Option ${index + 1} name`}
                      value={option.title}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((entry, at) =>
                            at === index ? { ...entry, title: event.target.value } : entry
                          )
                        )
                      }
                    />
                    <Input
                      className="min-w-0 flex-1"
                      placeholder="S, M, L"
                      aria-label={`Option ${index + 1} values`}
                      value={option.values}
                      onChange={(event) =>
                        setOptions((current) =>
                          current.map((entry, at) =>
                            at === index ? { ...entry, values: event.target.value } : entry
                          )
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove option ${index + 1}`}
                      onClick={() =>
                        setOptions((current) => current.filter((_, at) => at !== index))
                      }
                    >
                      <X />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={options.length >= MAX_OPTIONS}
                  onClick={() =>
                    setOptions((current) => [...current, { title: "", values: "" }])
                  }
                >
                  <Plus />
                  Add option
                </Button>
              </div>
              <FieldDescription>
                {options.length
                  ? `Values separated by commas. This makes ${variants} variant${variants === 1 ? "" : "s"}${tooManyVariants ? `; the limit is ${MAX_VARIANTS}` : ""}.`
                  : "No options makes one default variant."}
              </FieldDescription>
            </Field>
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
            <Button type="submit" disabled={create.isPending || tooManyVariants}>
              {create.isPending ? <Spinner /> : null}
              Create product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
