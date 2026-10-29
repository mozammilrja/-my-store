import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ImagePlus, Trash2, TriangleAlert, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription } from "@/components/reui/alert"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, adminApi, uploadImage } from "@/lib/api"
import { toMajor, toMinor } from "@/lib/format"
import type { AdminProduct, ProductStatus, VariantPatch } from "@/lib/types"

type VariantDraft = {
  sku: string
  stock: string
  prices: Record<string, string>
  compareAtPrices: Record<string, string>
  manageInventory: boolean
  allowBackorder: boolean
}

const draftOf = (product: AdminProduct, currencies: string[]) =>
  Object.fromEntries(
    product.variants.map((v) => [
      v.id,
      {
        sku: v.sku ?? "",
        stock: String(v.stock),
        prices: Object.fromEntries(
          currencies.map((c) => [c, v.prices[c] === undefined ? "" : toMajor(v.prices[c], c)])
        ),
        compareAtPrices: Object.fromEntries(
          currencies.map((c) => [
            c,
            v.compareAtPrices[c] === undefined ? "" : toMajor(v.compareAtPrices[c], c),
          ])
        ),
        manageInventory: v.manageInventory,
        allowBackorder: v.allowBackorder,
      } satisfies VariantDraft,
    ])
  )

const ProductDetailPage = () => {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ["product", id],
    queryFn: async () => (await adminApi.product(id)).product,
  })
  const regions = useQuery({
    queryKey: ["regions"],
    queryFn: async () => (await adminApi.regions()).regions,
    staleTime: 10 * 60_000,
  })
  const collections = useQuery({
    queryKey: ["collections"],
    queryFn: async () => (await adminApi.collections()).collections,
    staleTime: 10 * 60_000,
  })

  const currencies = [...new Set((regions.data ?? []).map((r) => r.currency))]

  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<ProductStatus>("draft")
  const [handle, setHandle] = useState("")
  const [material, setMaterial] = useState("")
  const [tags, setTags] = useState("")
  const [collectionId, setCollectionId] = useState<string>("none")
  const [images, setImages] = useState<string[]>([])
  const [variants, setVariants] = useState<Record<string, VariantDraft>>({})

  // Fill the form once the product and the currency list are both known.
  useEffect(() => {
    const product = query.data
    if (!product || !currencies.length) return
    setTitle(product.title)
    setSubtitle(product.subtitle ?? "")
    setDescription(product.description ?? "")
    setStatus(product.status)
    setHandle(product.handle)
    setMaterial(product.material ?? "")
    setTags(product.tags.join(", "))
    setCollectionId(product.collectionId ?? "none")
    setImages(product.images)
    setVariants(draftOf(product, currencies))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, currencies.join(",")])

  const save = useMutation({
    mutationFn: () => {
      const variantPatch: VariantPatch[] = Object.entries(variants).map(([variantId, draft]) => {
        const prices: Record<string, number> = {}
        const compareAtPrices: Record<string, number> = {}
        for (const [currency, value] of Object.entries(draft.prices)) {
          if (value.trim() !== "") prices[currency] = toMinor(value, currency)
        }
        for (const [currency, value] of Object.entries(draft.compareAtPrices)) {
          if (value.trim() !== "") compareAtPrices[currency] = toMinor(value, currency)
        }
        return {
          id: variantId,
          sku: draft.sku.trim() ? draft.sku.trim() : null,
          prices,
          compareAtPrices,
          stock: Number(draft.stock) || 0,
          manageInventory: draft.manageInventory,
          allowBackorder: draft.allowBackorder,
        }
      })

      return adminApi.updateProduct(id, {
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        status,
        handle: handle.trim(),
        material: material.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        collectionId: collectionId === "none" ? null : collectionId,
        images,
        variants: variantPatch,
      })
    },
    onSuccess: ({ product }) => {
      setError(null)
      queryClient.setQueryData(["product", id], product)
      queryClient.invalidateQueries({ queryKey: ["/admin/products"] })
      toast.success("Product saved")
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : "Could not save this product."),
  })

  const remove = useMutation({
    mutationFn: () => adminApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/products"] })
      toast.success("Product deleted")
      navigate("/products", { replace: true })
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : "Could not delete this product."),
  })

  const upload = useMutation({
    mutationFn: (file: File) => uploadImage(file),
    onSuccess: ({ url }) => {
      setImages((current) => [...current, url])
      toast.success("Image added. Save to keep it.")
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.message : "Could not upload that image."),
  })

  const product = query.data
  const setVariant = (variantId: string, patch: Partial<VariantDraft>) =>
    setVariants((current) => ({ ...current, [variantId]: { ...current[variantId]!, ...patch } }))

  return (
    <>
      <PageHeader
        eyebrow="Catalog & inventory"
        title={product ? product.title : "Product"}
        description={product ? `${product.variants.length} variants` : "Loading the product"}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/products">
                <ArrowLeft />
                All products
              </Link>
            </Button>
            {product ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={remove.isPending}>
                    <Trash2 />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {product.title} will be removed from the catalog. Past orders keep their own
                      copy of the item, so they stay intact. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={remove.isPending}>Keep it</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={remove.isPending}
                      onClick={(event) => {
                        event.preventDefault()
                        remove.mutate()
                      }}
                    >
                      {remove.isPending ? <Spinner /> : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button size="sm" disabled={!product || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? <Spinner /> : null}
              Save changes
            </Button>
          </>
        }
      />

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Skeleton className="h-96 xl:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      ) : query.isError || !product ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertDescription className="flex flex-col items-start gap-3">
            {query.error instanceof Error ? query.error.message : "This product could not be loaded."}
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {error ? (
            <Alert variant="destructive" className="animate-in fade-in duration-200">
              <TriangleAlert aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
            <div className="flex flex-col gap-4 xl:col-span-2">
              <Frame>
                <FrameHeader>
                  <FrameTitle>Details</FrameTitle>
                  <FrameDescription>What shoppers read on the product page</FrameDescription>
                </FrameHeader>
                <FramePanel>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="title">Title</FieldLabel>
                      <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="subtitle">Subtitle</FieldLabel>
                      <Input
                        id="subtitle"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="description">Description</FieldLabel>
                      <Textarea
                        id="description"
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="handle">Handle</FieldLabel>
                      <Input
                        id="handle"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="material">Material</FieldLabel>
                      <Input
                        id="material"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="tags">Tags</FieldLabel>
                      <Input
                        id="tags"
                        value={tags}
                        placeholder="new-arrival, sale"
                        onChange={(e) => setTags(e.target.value)}
                      />
                    </Field>
                  </FieldGroup>
                </FramePanel>
              </Frame>

              <Frame>
                <FrameHeader>
                  <FrameTitle>Variants</FrameTitle>
                  <FrameDescription>Prices and stock, per option combination</FrameDescription>
                </FrameHeader>
                <FramePanel className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variant</TableHead>
                          <TableHead>SKU</TableHead>
                          {currencies.map((currency) => (
                            <TableHead key={currency} className="text-right">
                              {currency.toUpperCase()}
                            </TableHead>
                          ))}
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Track</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {product.variants.map((variant) => {
                          const draft = variants[variant.id]
                          if (!draft) return null
                          return (
                            <TableRow key={variant.id}>
                              <TableCell className="font-medium">{variant.title}</TableCell>
                              <TableCell>
                                <Input
                                  aria-label={`SKU for ${variant.title}`}
                                  className="w-28"
                                  value={draft.sku}
                                  onChange={(e) => setVariant(variant.id, { sku: e.target.value })}
                                />
                              </TableCell>
                              {currencies.map((currency) => (
                                <TableCell key={currency}>
                                  <Input
                                    aria-label={`${currency.toUpperCase()} price for ${variant.title}`}
                                    inputMode="decimal"
                                    className="w-24 text-right"
                                    value={draft.prices[currency] ?? ""}
                                    onChange={(e) =>
                                      setVariant(variant.id, {
                                        prices: { ...draft.prices, [currency]: e.target.value },
                                      })
                                    }
                                  />
                                </TableCell>
                              ))}
                              <TableCell>
                                <Input
                                  aria-label={`Stock for ${variant.title}`}
                                  inputMode="numeric"
                                  className="w-20 text-right"
                                  value={draft.stock}
                                  onChange={(e) =>
                                    setVariant(variant.id, { stock: e.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Switch
                                  aria-label={`Track stock for ${variant.title}`}
                                  checked={draft.manageInventory}
                                  onCheckedChange={(checked) =>
                                    setVariant(variant.id, { manageInventory: checked })
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </FramePanel>
              </Frame>
            </div>

            <div className="flex flex-col gap-4">
              <Frame>
                <FrameHeader>
                  <FrameTitle>Visibility</FrameTitle>
                </FrameHeader>
                <FramePanel>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="status">Status</FieldLabel>
                      <Select
                        value={status}
                        onValueChange={(value) => setStatus(value as ProductStatus)}
                      >
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="collection">Collection</FieldLabel>
                      <Select value={collectionId} onValueChange={setCollectionId}>
                        <SelectTrigger id="collection">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No collection</SelectItem>
                          {(collections.data ?? []).map((collection) => (
                            <SelectItem key={collection.id} value={collection.id}>
                              {collection.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                </FramePanel>
              </Frame>

              <Frame>
                <FrameHeader>
                  <FrameTitle>Images</FrameTitle>
                  <FrameDescription>The first one is the thumbnail</FrameDescription>
                </FrameHeader>
                <FramePanel>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((image) => (
                        <div key={image} className="group/image relative">
                          <div className="bg-muted aspect-square overflow-hidden border">
                            <img src={image} alt="" className="size-full object-cover" />
                          </div>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label="Remove image"
                            className="absolute top-1 right-1"
                            onClick={() =>
                              setImages((current) => current.filter((i) => i !== image))
                            }
                          >
                            <X />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) upload.mutate(file)
                        event.target.value = ""
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={upload.isPending}
                      onClick={() => fileInput.current?.click()}
                    >
                      {upload.isPending ? <Spinner /> : <ImagePlus />}
                      Add image
                    </Button>
                  </div>
                </FramePanel>
              </Frame>

              <Frame>
                <FrameHeader>
                  <FrameTitle>Stock</FrameTitle>
                </FrameHeader>
                <FramePanel>
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground text-sm">Across all variants</span>
                    <span className="text-2xl font-semibold tracking-tight tabular-nums">
                      {product.totalStock}
                    </span>
                  </div>
                </FramePanel>
              </Frame>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default ProductDetailPage
