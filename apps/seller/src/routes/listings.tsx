import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ImagePlus, Plus, X } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useFeedback } from "@/components/feedback"
import { Button, cn, Empty, Input, Label, Notice, Panel, Select, Spinner, Textarea } from "@/components/ui"
import { api, errorMessage } from "@/lib/api"
import { money, useSession } from "@/lib/session"
import type { Listing } from "@/lib/types"

const REVIEW: Record<Listing["review"]["status"], { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-panel-strong text-ink-2" },
  pending: { label: "In review", tone: "bg-info-bg text-info" },
  approved: { label: "Live", tone: "bg-ok-bg text-ok" },
  rejected: { label: "Needs changes", tone: "bg-bad-bg text-bad" },
}

export function Listings() {
  const listings = useQuery({ queryKey: ["listings"], queryFn: () => api<{ listings: Listing[] }>("/listings") })
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Listings</h1>
        <Link to="/listings/new" className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover">
          <Plus className="size-4" aria-hidden /> New listing
        </Link>
      </div>
      {listings.isPending ? (
        <Spinner />
      ) : listings.isError ? (
        <Notice>{errorMessage(listings.error)}</Notice>
      ) : listings.data.listings.length === 0 ? (
        <Empty title="No listings yet">Add your first product. It goes live once our team approves it.</Empty>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-panel">
          {listings.data.listings.map((l) => (
            <li key={l.id}>
              <Link to={`/listings/${l.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-panel-muted">
                <span className="size-14 shrink-0 overflow-hidden rounded-control bg-panel-strong">{l.images[0] ? <img src={l.images[0].url} alt="" className="size-full object-cover" /> : null}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{l.title}</span>
                  <span className="text-xs text-ink-3">
                    {l.variants.length} variant{l.variants.length === 1 ? "" : "s"} · from {money(Math.min(...l.variants.map((v) => v.price)))} · {l.variants.reduce((n, v) => n + v.stock, 0)} in stock
                  </span>
                </span>
                <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", REVIEW[l.review.status].tone)}>{REVIEW[l.review.status].label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type Draft = {
  title: string
  description: string
  categoryId: string
  images: { path: string; url: string }[]
  material: string
  weight: string
  sizes: string
  colours: string
  rows: Record<string, { sku: string; price: string; compareAt: string }>
}

const combos = (sizes: string[], colours: string[]) => (colours.length ? sizes.flatMap((s) => colours.map((c) => ({ Size: s, Colour: c }))) : sizes.map((s) => ({ Size: s })))
const keyOf = (o: Record<string, string>) => Object.values(o).join(" / ")
const split = (s: string) => [...new Set(s.split(",").map((x) => x.trim()).filter(Boolean))]

export function ListingEditor() {
  const { id } = useParams()
  const isNew = !id || id === "new"
  const listing = useQuery({ queryKey: ["listing", id], queryFn: () => api<{ listing: Listing }>(`/listings/${id}`), enabled: !isNew })
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api<{ categories: { _id: string; name: string }[] }>("/categories") })
  if (!isNew && listing.isPending) return <Spinner />
  if (listing.isError) return <Notice>{errorMessage(listing.error)}</Notice>
  return <Editor key={id ?? "new"} listing={listing.data?.listing ?? null} categories={categories.data?.categories ?? []} />
}

function Editor({ listing, categories }: { listing: Listing | null; categories: { _id: string; name: string }[] }) {
  const { approved } = useSession()
  const feedback = useFeedback()
  const client = useQueryClient()
  const navigate = useNavigate()
  const live = listing?.review.status === "approved"
  const sizeOpt = listing?.options.find((o) => o.title === "Size")
  const colourOpt = listing?.options.find((o) => o.title === "Colour")
  const [d, setD] = useState<Draft>(() => ({
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    categoryId: listing?.categoryIds[0] ?? "",
    images: listing?.images ?? [],
    material: listing?.material ?? "",
    weight: listing?.weight ? String(listing.weight) : "",
    sizes: sizeOpt?.values.join(", ") ?? "S, M, L",
    colours: colourOpt?.values.join(", ") ?? "",
    rows: Object.fromEntries((listing?.variants ?? []).map((v) => [keyOf(v.options), { sku: v.sku, price: String(v.price / 100), compareAt: v.compareAtPrice ? String(v.compareAtPrice / 100) : "" }])),
  }))
  const variants = useMemo(() => combos(split(d.sizes), split(d.colours)), [d.sizes, d.colours])
  const [uploading, setUploading] = useState(false)

  const body = () => {
    const sizes = split(d.sizes)
    const colours = split(d.colours)
    return {
      title: d.title,
      description: d.description || undefined,
      categoryIds: d.categoryId ? [d.categoryId] : [],
      images: d.images.map((i) => i.path),
      material: d.material || undefined,
      weight: d.weight ? Number(d.weight) : undefined,
      options: [{ title: "Size", values: sizes }, ...(colours.length ? [{ title: "Colour", values: colours }] : [])],
      variants: variants.map((o) => {
        const r = d.rows[keyOf(o)] ?? { sku: "", price: "", compareAt: "" }
        return { sku: r.sku, options: o, price: Math.round(Number(r.price) * 100), compareAtPrice: r.compareAt ? Math.round(Number(r.compareAt) * 100) : null }
      }),
    }
  }
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["listings"] })
    void client.invalidateQueries({ queryKey: ["listing"] })
  }
  const save = useMutation({
    mutationFn: () => (listing ? api<{ listing: Listing }>(`/listings/${listing.id}`, { method: "PUT", body: body() }) : api<{ listing: Listing }>("/listings", { body: body() })),
    onSuccess: (r) => {
      feedback.ok("Saved")
      refresh()
      if (!listing) navigate(`/listings/${r.listing.id}`, { replace: true })
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const submit = useMutation({
    mutationFn: () => api(`/listings/${listing!.id}/submit`, { body: {} }),
    onSuccess: () => {
      feedback.ok("Sent for review")
      refresh()
    },
    onError: (e) => feedback.bad(errorMessage(e)),
  })
  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.set("file", file)
        const r = await api<{ path: string; url: string }>("/uploads", { form })
        setD((x) => ({ ...x, images: [...x.images, r] }))
      }
    } catch (e) {
      feedback.bad(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }
  const onSave = (e: FormEvent) => {
    e.preventDefault()
    save.mutate()
  }
  const row = (k: string) => d.rows[k] ?? { sku: "", price: "", compareAt: "" }
  const setRow = (k: string, patch: Partial<Draft["rows"][string]>) => setD((x) => ({ ...x, rows: { ...x.rows, [k]: { ...row(k), ...patch } } }))

  return (
    <form onSubmit={onSave} className="space-y-5">
      <Link to="/listings" className="inline-flex items-center gap-1 text-sm text-ink-2">
        <ArrowLeft className="size-4" aria-hidden /> Listings
      </Link>
      <h1 className="text-xl font-semibold">{listing ? listing.title : "New listing"}</h1>
      {listing?.review.status === "rejected" ? <Notice>Our team asked for changes: {listing.review.note}</Notice> : null}
      {listing?.review.status === "pending" ? <Notice tone="info">In review. You can still make changes.</Notice> : null}
      {live ? <Notice tone="info">This listing is live. You can change prices here; for other changes, contact seller support.</Notice> : null}

      <Panel title="Product">
        <fieldset disabled={live} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="t">Title</Label>
            <Input id="t" required minLength={3} value={d.title} onChange={(e) => setD((x) => ({ ...x, title: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={4} value={d.description} onChange={(e) => setD((x) => ({ ...x, description: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="cat">Category</Label>
            <Select id="cat" required value={d.categoryId} onChange={(e) => setD((x) => ({ ...x, categoryId: e.target.value }))}>
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mat">Material</Label>
              <Input id="mat" value={d.material} onChange={(e) => setD((x) => ({ ...x, material: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="w">Weight (g)</Label>
              <Input id="w" type="number" min={1} value={d.weight} onChange={(e) => setD((x) => ({ ...x, weight: e.target.value }))} />
            </div>
          </div>
        </fieldset>
      </Panel>

      <Panel title="Photos">
        <ul className="flex flex-wrap gap-3">
          {d.images.map((img, i) => (
            <li key={img.path} className="relative size-24 overflow-hidden rounded-control border border-line">
              <img src={img.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              {!live ? (
                <button type="button" onClick={() => setD((x) => ({ ...x, images: x.images.filter((_, j) => j !== i) }))} className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white" aria-label={`Remove photo ${i + 1}`}>
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
          {!live ? (
            <li>
              <label className="grid size-24 cursor-pointer place-items-center rounded-control border border-dashed border-line-strong text-ink-3 hover:bg-panel-muted">
                <ImagePlus className="size-6" aria-hidden />
                <span className="sr-only">Add photos</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={uploading} onChange={(e) => void upload(e.target.files)} />
              </label>
            </li>
          ) : null}
        </ul>
        <p className="mt-2 text-xs text-ink-3">JPEG, PNG or WebP, up to 5 MB each. The first photo is the main one.</p>
      </Panel>

      <Panel title="Sizes, colours and prices">
        <fieldset disabled={live} className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="sizes">Sizes (comma-separated)</Label>
            <Input id="sizes" value={d.sizes} onChange={(e) => setD((x) => ({ ...x, sizes: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="colours">Colours (optional)</Label>
            <Input id="colours" value={d.colours} onChange={(e) => setD((x) => ({ ...x, colours: e.target.value }))} placeholder="Indigo, Rust" />
          </div>
        </fieldset>
        <div className="-mx-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="text-left text-xs text-ink-3">
              <tr>
                <th className="px-4 pb-2 font-medium">Variant</th>
                <th className="px-2 pb-2 font-medium">SKU</th>
                <th className="px-2 pb-2 font-medium">Price (₹)</th>
                <th className="px-4 pb-2 font-medium">MRP (₹, optional)</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((o) => {
                const k = keyOf(o)
                return (
                  <tr key={k}>
                    <td className="px-4 py-1.5 font-medium">{k}</td>
                    <td className="px-2 py-1.5">
                      <Input aria-label={`SKU for ${k}`} required disabled={live} pattern="[A-Za-z0-9-]{3,40}" value={row(k).sku} onChange={(e) => setRow(k, { sku: e.target.value.toUpperCase() })} className="font-mono" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input aria-label={`Price for ${k}`} required type="number" min={1} step="0.01" value={row(k).price} onChange={(e) => setRow(k, { price: e.target.value })} />
                    </td>
                    <td className="px-4 py-1.5">
                      <Input aria-label={`MRP for ${k}`} type="number" min={1} step="0.01" value={row(k).compareAt} onChange={(e) => setRow(k, { compareAt: e.target.value })} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-3">SKUs are printed on your labels and scanned at packing; each must be unique on Everwear. Stock is added on the Stock page.</p>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" busy={save.isPending}>
          {live ? "Save prices" : "Save"}
        </Button>
        {listing && ["draft", "rejected"].includes(listing.review.status) ? (
          <Button type="button" variant="secondary" disabled={!approved} busy={submit.isPending} onClick={() => submit.mutate()} title={approved ? undefined : "Available once your account is approved"}>
            Submit for review
          </Button>
        ) : null}
      </div>
      {!approved && listing ? <p className="text-xs text-ink-3">You can submit listings for review once your seller account is approved.</p> : null}
    </form>
  )
}
