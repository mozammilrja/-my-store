import { ImageIcon, Plus } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/page-header"
import { ProductCreateDialog } from "@/components/product-create-dialog"
import {
  ResourceGrid,
  type GridColumn,
  type GridFilter,
} from "@/components/resource-grid"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCount } from "@/lib/format"
import type { AdminProduct } from "@/lib/types"

const short = <Skeleton className="h-4 w-12" />

/** The one facet `/admin/products` filters on. */
const filters: GridFilter[] = [
  {
    key: "status",
    label: "Statuses",
    options: [
      { value: "published", label: "Published" },
      { value: "draft", label: "Draft" },
    ],
  },
]

const columns: GridColumn<AdminProduct>[] = [
  {
    id: "title",
    header: "Product",
    size: 320,
    meta: {
      skeleton: (
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0" />
          <Skeleton className="h-4 w-40" />
        </div>
      ),
    },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden border">
          {row.original.thumbnail ? (
            <img src={row.original.thumbnail} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="text-muted-foreground size-4" aria-hidden="true" />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <Link
            to={`/products/${row.original.id}`}
            className="truncate font-medium hover:underline"
          >
            {row.original.title}
          </Link>
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
    meta: {
      headerClassName: "text-end [&>div]:justify-end",
      cellClassName: "text-end tabular-nums",
      skeleton: short,
    },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatCount(row.original.variants.length)}</span>
    ),
  },
  {
    id: "stock",
    header: "In stock",
    size: 110,
    meta: {
      headerClassName: "text-end [&>div]:justify-end",
      cellClassName: "text-end tabular-nums",
      skeleton: short,
    },
    cell: ({ row }) => {
      const stock = row.original.totalStock
      return (
        <span
          className={
            stock === 0
              ? "text-destructive-foreground font-medium tabular-nums"
              : "tabular-nums"
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
    meta: { skeleton: <Skeleton className="h-4 w-24" /> },
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
    meta: { skeleton: <Skeleton className="h-5 w-16" /> },
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

const ProductsPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        eyebrow="Catalog & inventory"
        title="Products"
        description="Everything listed in your catalog."
        actions={
          <ProductCreateDialog
            trigger={
              <Button size="sm">
                <Plus />
                New product
              </Button>
            }
          />
        }
      />
      <ResourceGrid<AdminProduct>
        path="/admin/products"
        resultKey="products"
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by title, handle or SKU"
        emptyMessage="No products yet"
        onRowClick={(product) => navigate(`/products/${product.id}`)}
      />
    </>
  )
}

export default ProductsPage
