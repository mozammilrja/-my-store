import { ImageIcon } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { ResourceGrid, type GridColumn } from "@/components/resource-grid"
import { StatusBadge } from "@/components/status-badge"
import { formatCount } from "@/lib/format"
import type { AdminProduct } from "@/lib/types"

const columns: GridColumn<AdminProduct>[] = [
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
    id: "variants",
    header: "Variants",
    size: 110,
    meta: { headerClassName: "text-right", cellClassName: "text-right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatCount(row.original.variants.length)}</span>
    ),
  },
  {
    id: "stock",
    header: "In stock",
    size: 110,
    meta: { headerClassName: "text-right", cellClassName: "text-right" },
    cell: ({ row }) => {
      const stock = row.original.totalStock
      return (
        <span
          className={
            stock === 0 ? "text-destructive font-medium tabular-nums" : "tabular-nums"
          }
        >
          {formatCount(stock)}
        </span>
      )
    },
  },
  {
    id: "tags",
    header: "Tags",
    size: 200,
    cell: ({ row }) =>
      row.original.tags.length ? (
        <span className="text-muted-foreground truncate">
          {row.original.tags.join(", ")}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
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
    <PageHeader title="Products" description="Everything listed in your catalog." />
    <ResourceGrid<AdminProduct>
      path="/admin/products"
      resultKey="products"
      columns={columns}
      searchPlaceholder="Search by title, handle or SKU"
      emptyMessage="No products yet"
    />
  </>
)

export default ProductsPage
