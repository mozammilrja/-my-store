import React, { useEffect, useMemo, useState } from 'react';
import { Icon, Button, Input, Checkbox, Badge } from '../ui';
import {
  SectionCard,
  DataTable,
  StatusBadge,
  EmptyState,
  FormField,
  FormInput,
  FormTextarea,
} from '../shared';
import { cn } from '../../lib/utils';

/**
 * The product editor panels that read and write real variant and storefront
 * data. They were previously fixed markup: two invented colourways with a
 * typed-in SKU list, and no stock or storefront panel at all.
 */

/** The API sends a variant's key as `id`; `_id` only exists in the database. */
const variantKey = (v) => v.id ?? v._id;

const money = (minor, currency = 'inr') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format((Number(minor) || 0) / 100);

/** Variants exactly as the product carries them. */
export function VariantMatrixPanel({ product }) {
  const variants = product?.rawBackend?.variants ?? [];

  const optionTitles = useMemo(() => {
    const titles = new Set();
    variants.forEach((v) => Object.keys(v.options ?? {}).forEach((k) => titles.add(k)));
    return [...titles];
  }, [variants]);

  if (!variants.length) {
    return (
      <SectionCard title="Size and colour variants">
        <EmptyState
          icon="grid_view"
          title="This product has no variants"
          message="Variants are created with the product. A product without them is sold as a single SKU."
        />
      </SectionCard>
    );
  }

  const columns = [
    { key: 'title', header: 'Variant', accessor: (v) => v.title || 'Default' },
    {
      key: 'sku',
      header: 'SKU',
      accessor: (v) => (
        <span className="font-mono text-num text-secondary">{v.sku || 'Not set'}</span>
      ),
    },
    ...optionTitles.map((opt) => ({
      key: `opt-${opt}`,
      header: opt,
      accessor: (v) => v.options?.[opt] ?? '-',
    })),
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      accessor: (v) => money(v.prices?.inr ?? 0),
    },
    {
      key: 'stock',
      header: 'On hand',
      align: 'right',
      accessor: (v) =>
        v.manageInventory ? (
          <span className={cn(v.stock <= 0 && 'text-danger')}>{v.stock}</span>
        ) : (
          <span className="text-faint">Not tracked</span>
        ),
    },
  ];

  return (
    <SectionCard
      title="Size and colour variants"
      description={`${variants.length} variant${variants.length === 1 ? '' : 's'} on this product.`}
    >
      <DataTable
        columns={columns}
        data={variants}
        keyField="id"
        caption="Variants of this product"
      />
    </SectionCard>
  );
}

/**
 * Stock allocation.
 *
 * Edits land on the product's own variants through PATCH /admin/products/:id,
 * which accepts stock, manageInventory, allowBackorder and sku per variant.
 * Nothing is saved until Save is pressed, and the button stays disabled while
 * nothing has changed.
 */
export function StockAllocationPanel({ product, onSave, isSaving, canEdit = true }) {
  const variants = useMemo(() => product?.rawBackend?.variants ?? [], [product]);
  const [draft, setDraft] = useState({});

  // Reset the draft whenever a different product is loaded, so edits never
  // leak from one product onto the next.
  useEffect(() => {
    setDraft({});
  }, [product?.id]);

  const valueFor = (variant, field) => draft[variantKey(variant)]?.[field] ?? variant[field];

  const setField = (variantId, field, value) =>
    setDraft((prev) => ({ ...prev, [variantId]: { ...prev[variantId], [field]: value } }));

  const changed = useMemo(
    () =>
      variants.filter((v) => {
        const d = draft[variantKey(v)];
        if (!d) return false;
        return Object.entries(d).some(([k, val]) => val !== v[k]);
      }),
    [draft, variants]
  );

  const totals = useMemo(() => {
    const tracked = variants.filter((v) => valueFor(v, 'manageInventory'));
    return {
      tracked: tracked.length,
      units: tracked.reduce((n, v) => n + (Number(valueFor(v, 'stock')) || 0), 0),
      outOfStock: tracked.filter((v) => (Number(valueFor(v, 'stock')) || 0) <= 0).length,
    };
  }, [variants, draft]);

  if (!variants.length) {
    return (
      <SectionCard title="Stock allocation">
        <EmptyState
          icon="warehouse"
          title="Nothing to allocate"
          message="This product has no variants, so there is no stock to hold against it."
        />
      </SectionCard>
    );
  }

  const handleSave = () => {
    onSave(
      changed.map((v) => {
        const d = draft[variantKey(v)];
        return {
          id: variantKey(v),
          ...(d.stock !== undefined ? { stock: Number(d.stock) || 0 } : {}),
          ...(d.manageInventory !== undefined ? { manageInventory: d.manageInventory } : {}),
          ...(d.allowBackorder !== undefined ? { allowBackorder: d.allowBackorder } : {}),
        };
      }),
      () => setDraft({})
    );
  };

  // One row per variant, with the derived stock state the cells read.
  const inventoryRows = variants.map((v) => {
    const tracked = valueFor(v, 'manageInventory');
    const stock = Number(valueFor(v, 'stock')) || 0;
    const key = variantKey(v);
    return {
      key,
      variant: v,
      title: v.title || 'Default',
      sku: v.sku || 'Not set',
      tracked,
      stock,
      backorder: valueFor(v, 'allowBackorder'),
      isDirty: Boolean(draft[key]),
    };
  });

  const inventoryColumns = [
    { key: 'variant', header: 'Variant', className: 'text-primary', accessor: 'title' },
    { key: 'sku', header: 'SKU', className: 'font-mono text-num text-secondary', accessor: 'sku' },
    {
      key: 'stock',
      header: 'Units on hand',
      align: 'right',
      cell: (row) => (
        <Input
          type="number"
          min="0"
          inputMode="numeric"
          value={row.stock}
          disabled={!row.tracked || !canEdit}
          onChange={(e) => setField(row.key, 'stock', e.target.value)}
          aria-label={`Units on hand for ${row.variant.title || 'default variant'}`}
          className="ml-auto w-24 text-right tabular-nums"
        />
      ),
    },
    {
      key: 'tracked',
      fit: true,
      header: 'Track inventory',
      align: 'center',
      cell: (row) => (
        <Checkbox
          checked={row.tracked}
          disabled={!canEdit}
          onChange={(e) => setField(row.key, 'manageInventory', e.target.checked)}
          aria-label={`Track inventory for ${row.variant.title || 'default variant'}`}
        />
      ),
    },
    {
      key: 'backorder',
      fit: true,
      header: 'Allow backorder',
      align: 'center',
      cell: (row) => (
        <Checkbox
          checked={row.backorder}
          disabled={!row.tracked || !canEdit}
          onChange={(e) => setField(row.key, 'allowBackorder', e.target.checked)}
          aria-label={`Allow backorder for ${row.variant.title || 'default variant'}`}
        />
      ),
    },
    {
      key: 'status',
      fit: true,
      header: 'Status',
      cell: (row) =>
        !row.tracked ? (
          <StatusBadge status="Not tracked" variant="neutral" />
        ) : row.stock > 0 ? (
          <StatusBadge status="In stock" variant="success" />
        ) : row.backorder ? (
          <StatusBadge status="On backorder" variant="warning" />
        ) : (
          <StatusBadge status="Out of stock" variant="destructive" />
        ),
    },
  ];


  return (
    <SectionCard
      title="Stock allocation"
      description="Units on hand per variant. Saved straight onto the product."
      action={
        <div className="flex items-center gap-2">
          {changed.length > 0 && (
            <span className="text-meta text-muted">
              {changed.length} unsaved {changed.length === 1 ? 'change' : 'changes'}
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!canEdit || isSaving || changed.length === 0}
            title={canEdit ? undefined : 'Your role cannot change stock'}
          >
            {isSaving ? 'Saving' : 'Save stock'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-space-md">
        <div className="flex flex-wrap gap-space-md">
          <div className="flex flex-col">
            <span className="text-meta text-muted">Tracked variants</span>
            <span className="text-kpi-sm text-primary tabular-nums">{totals.tracked}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-meta text-muted">Units on hand</span>
            <span className="text-kpi-sm text-primary tabular-nums">{totals.units}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-meta text-muted">Out of stock</span>
            <span
              className={cn(
                'text-kpi-sm tabular-nums',
                totals.outOfStock > 0 ? 'text-danger' : 'text-primary'
              )}
            >
              {totals.outOfStock}
            </span>
          </div>
        </div>

        <DataTable
          data={inventoryRows}
          columns={inventoryColumns}
          keyField="key"
          caption="Stock on hand for each variant"
          containerClassName="border-0 bg-transparent shadow-none rounded-none"
          rowClassName={(row) => (row.isDirty ? 'bg-status-info-bg' : '')}
          emptyIcon="inventory_2"
          emptyTitle="No variants to stock"
          emptyMessage="This product has no variants, so there is nothing to count."
        />
      </div>
    </SectionCard>
  );
}

/**
 * Storefront and SEO.
 *
 * The storefront builds a product's title, meta description, canonical URL and
 * Open Graph tags from the product's own title, description, handle and
 * thumbnail; there is no separate metadata record to edit. So this panel edits
 * those real fields and previews the result, rather than offering SEO inputs
 * that would persist nowhere.
 */
export function StorefrontSeoPanel({
  product,
  title,
  description,
  onSave,
  isSaving,
  storefrontOrigin = 'http://localhost:8001',
}) {
  const backend = product?.rawBackend ?? {};
  const [handle, setHandle] = useState(backend.handle ?? '');
  const [tags, setTags] = useState((backend.tags ?? []).join(', '));
  const [metaDescription, setMetaDescription] = useState(description ?? '');
  const [status, setStatus] = useState(backend.status ?? 'draft');

  useEffect(() => {
    setHandle(backend.handle ?? '');
    setTags((backend.tags ?? []).join(', '));
    setMetaDescription(description ?? '');
    setStatus(backend.status ?? 'draft');
  }, [product?.id, backend.handle, backend.status, description]);

  const handleError =
    handle && !/^[a-z0-9][a-z0-9-]{0,99}$/.test(handle)
      ? 'Use lowercase letters, numbers and dashes only.'
      : null;

  const tagList = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const dirty =
    handle !== (backend.handle ?? '') ||
    status !== (backend.status ?? 'draft') ||
    metaDescription !== (description ?? '') ||
    tagList.join(',') !== (backend.tags ?? []).join(',');

  const previewUrl = `${storefrontOrigin}/in/products/${handle || 'your-product'}`;
  const previewDescription = metaDescription || title || 'No description yet.';

  return (
    <div className="flex flex-col gap-space-lg">
      <SectionCard
        title="Storefront listing"
        description="These are the fields the storefront reads when it renders this product and its meta tags."
        action={
          <Button
            size="sm"
            onClick={() =>
              onSave({
                handle,
                status,
                description: metaDescription,
                tags: tagList,
              })
            }
            disabled={isSaving || !dirty || Boolean(handleError)}
          >
            {isSaving ? 'Saving' : 'Save storefront fields'}
          </Button>
        }
      >
        <div className="flex flex-col gap-space-md">
          <FormInput
            id="seo-handle"
            label="URL handle"
            helperText="The product's address on the storefront, and its canonical URL."
            error={handleError}
            value={handle}
            onChange={(value) => setHandle(value)}
            placeholder="sculpted-linen-blazer"
          />

          <FormTextarea
            id="seo-description"
            label="Meta description"
            helperText={`Used as the page description and Open Graph description. ${metaDescription.length} characters; search engines usually show about 160.`}
            value={metaDescription}
            onChange={(value) => setMetaDescription(value)}
            rows={3}
            placeholder="Describe the product as you want it to read in search results."
          />

          <FormInput
            id="seo-tags"
            label="Tags"
            helperText="Comma separated. Stored on the product."
            value={tags}
            onChange={(value) => setTags(value)}
            placeholder="linen, festive, womenswear"
          />

          <FormField label="Storefront visibility">
            <div className="flex flex-wrap items-center gap-2">
              {['published', 'draft'].map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={status === value ? 'default' : 'outline'}
                  onClick={() => setStatus(value)}
                >
                  {value === 'published' ? 'Published' : 'Draft'}
                </Button>
              ))}
              <span className="text-meta text-muted">
                {status === 'published'
                  ? 'Visible to shoppers and indexable.'
                  : 'Hidden from the storefront.'}
              </span>
            </div>
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        title="Search and social preview"
        description="How this product reads once the storefront renders its meta tags."
      >
        <div className="flex flex-col gap-space-md">
          <div className="flex flex-col gap-0.5 rounded-xl border border-subtle bg-surface-subtle p-space-md">
            <span className="truncate text-meta text-success">{previewUrl}</span>
            <span className="truncate text-body-lg text-accent">{title || 'Untitled product'}</span>
            <span className="line-clamp-2 text-meta text-muted">{previewDescription}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tagList.length === 0 ? (
              <span className="text-meta text-faint">No tags yet.</span>
            ) : (
              tagList.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))
            )}
          </div>

          {status !== 'published' && (
            <div className="flex items-start gap-2 rounded-lg border border-status-warning/25 bg-status-warning-bg p-space-sm">
              <Icon
                name="visibility_off"
                aria-hidden="true"
                className="material-symbols-outlined mt-px text-icon-sm text-warning"
              />
              <span className="text-meta text-secondary">
                This product is a draft, so the storefront will not serve this page at all.
              </span>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
