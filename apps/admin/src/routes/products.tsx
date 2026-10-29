import { useQuery } from "@tanstack/react-query"
import { ImageIcon } from "lucide-react"
import { useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { ResourceGrid, type GridColumn } from "@/components/resource-grid"
import { StatusBadge } from "@/components/status-badge"
import { adminApi } from "@/lib/api"
import { formatCount } from "@/lib/format"
import type { AdminProduct } from "@/lib/types"

/** Products carry a collection id; the name comes from the collections list. */
const useCollectionTitles = () => {
  const query = useQuery({
    queryKey: ["collections"],
    queryFn: async () => (await adminApi.collections()).collections,
    staleTime: 10 * 60_000,
  })

  return useMemo(
    () => new Map((query.data ?? []).map((collection) => [collection.id, collection.title])),
    [query.data]
  )
}

const buildColumns = (collectionTitles: Map<string, string>): GridColumn<AdminProduct>[] => [
  {
    id: "title",
    header: "Product",
    size: 320,
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border">
          {row.original.thumbnail ? (
            <img src={row.original.thumbnail} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="text-muted-foreground size-4" />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{row.original.title}</span>
          <span className="text-muted-foreground truncate text-xs">{row.original.handle}</span>
        </div>
      </div>
    ),
  },
  {
    id: "collection",
    header: "Collection",
    size: 180,
    cell: ({ row }) => {
      const title = row.original.collectionId
        ? collectionTitles.get(row.original.collectionId)
        : undefined
      return title ?? <span className="text-muted-foreground">—</span>
    },
  },
  {
    id: "variants",
    header: "Variants",
    size: 110,
    cell: ({ row }) => (
      <span className="tabular-nums">{formatCount(row.original.variants?.length ?? 0)}</span>
    ),
  },
  {
    id: "status",
    header: "Status",
    size: 130,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

const ProductsPage = () => {
  const collectionTitles = useCollectionTitles()
  const columns = useMemo(() => buildColumns(collectionTitles), [collectionTitles])

  return (
    <>
      <PageHeader title="Products" description="Everything listed in your catalog." />
      <ResourceGrid<AdminProduct>
        path="/admin/products"
        resultKey="products"
        columns={columns}
        searchPlaceholder="Search products"
        emptyMessage="No products yet"
      />
    </>
  )
}

export default ProductsPage
