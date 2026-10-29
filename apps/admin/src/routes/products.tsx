import type { HttpTypes } from "@medusajs/types"
import { ImageIcon, Plus } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { ResourceGrid, type GridColumn } from "@/components/resource-grid"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { formatCount } from "@/lib/format"
import { LEGACY_ADMIN_URL } from "@/lib/sdk"

type ProductRow = HttpTypes.AdminProduct

const columns: GridColumn<ProductRow>[] = [
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
          <span className="text-muted-foreground truncate text-xs">
            {row.original.handle}
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "collection",
    header: "Collection",
    size: 180,
    cell: ({ row }) =>
      row.original.collection?.title ?? <span className="text-muted-foreground">—</span>,
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

const ProductsPage = () => (
  <>
    <PageHeader
      title="Products"
      description="Everything listed in your catalog."
      actions={
        <Button size="sm" asChild>
          <a href={`${LEGACY_ADMIN_URL}/products/create`} target="_blank" rel="noreferrer">
            <Plus />
            New product
          </a>
        </Button>
      }
    />
    <ResourceGrid<ProductRow>
      path="/admin/products"
      resultKey="products"
      fields="id,title,handle,status,thumbnail,*collection,variants.id"
      columns={columns}
      searchPlaceholder="Search products"
      emptyMessage="No products yet"
      onRowClick={(product) =>
        window.open(`${LEGACY_ADMIN_URL}/products/${product.id}`, "_blank")
      }
    />
  </>
)

export default ProductsPage
