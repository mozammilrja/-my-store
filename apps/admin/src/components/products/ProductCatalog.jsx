import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { adminApi, describeUploadProblem } from '../../lib/api';
import { cn } from '../../lib/utils';
import { VariantMatrixPanel, StockAllocationPanel, StorefrontSeoPanel } from './ProductTabPanels';
import { useProductsQuery, useUpdateProductMutation, useCategoriesQuery } from '../../hooks/useAdminQueries';
import { Icon,
  Card,
  Button,
  buttonVariants,
  Badge,
  Input,
  Select,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  AppDialog,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  FilterBar,
  SectionCard,
  EmptyState,
  PageBody,
  SkeletonPage,
  Thumbnail,
  ColorSwatch,
} from '../ui';

const EMPTY_PRODUCT = {};

/** The chart palette as hex, read off the live theme (confetti takes hex only). */
const themeChartColors = () => {
  const root = getComputedStyle(document.documentElement);
  return ['chart-1', 'chart-2', 'chart-3', 'chart-4']
    .map((name) => root.getPropertyValue(`--${name}`).trim().split(/\s+/).map(Number))
    .filter((rgb) => rgb.length === 3 && rgb.every((n) => Number.isFinite(n)))
    .map((rgb) => `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('')}`);
};

/** Tab slugs, so the URL says which panel is open rather than a bare number. */
const TAB_SLUGS = {
  1: 'details',
  2: 'media',
  3: 'variants',
  4: 'pricing',
  5: 'tax',
  6: 'stock',
  7: 'storefront',
};
const SLUG_TO_TAB = Object.fromEntries(Object.entries(TAB_SLUGS).map(([id, slug]) => [slug, Number(id)]));

export function ProductCatalog({ onShowToast, currentHub }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = SLUG_TO_TAB[searchParams.get('tab')] ?? 1;
  // Pushed, not replaced: moving between tabs is navigation, so Back should
  // return to the tab you came from.
  const setActiveTab = (next) =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (Number(next) === 1) params.delete('tab');
      else params.set('tab', TAB_SLUGS[Number(next)]);
      return params;
    });

  const [activeCategory, setActiveCategory] = useState('All');

  const [allProducts, setAllProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeMediaSlot, setActiveMediaSlot] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Active product being edited
  // Empty rather than null so the form initialisers below stay simple; the
  // editor itself is gated on there being a real product to edit.
  const product = useMemo(
    () => allProducts.find((p) => p.id === selectedProductId) || allProducts[0] || EMPTY_PRODUCT,
    [allProducts, selectedProductId]
  );

  // Form states initialized from active product
  const [title, setTitle] = useState(product.title);
  const [brand, setBrand] = useState(product.brand || 'Everwear Atelier');
  const [collection, setCollection] = useState(product.collection || 'Autumn / Festive 24');
  const [styleCode, setStyleCode] = useState(product.styleCode || 'EVR-STYLE-01');
  const [department, setDepartment] = useState(product.department || 'Women');
  const [category, setCategory] = useState(product.category || 'Dresses & Jumpsuits');
  const [fabric, setFabric] = useState(product.fabricComposition || '100% Organic Cotton');
  const [silhouette, setSilhouette] = useState(product.silhouette || 'Flared Maxi Silhouette');
  const [pattern, setPattern] = useState(product.pattern || 'Handcrafted Artisan Print');
  const [washCare, setWashCare] = useState(product.washCare || 'Dry Clean Only');
  const [origin, setOrigin] = useState(product.origin || 'Jaipur Craft Guild, India');
  const [hsnCode, setHsnCode] = useState(product.hsnCode || '6204.49.00');
  const [gstRate, setGstRate] = useState(product.gstRate || 12);

  // Commercial pricing state
  const [mrp, setMrp] = useState(product.mrp ?? 0);
  const [b2cPrice, setB2cPrice] = useState(product.b2cPrice ?? 0);
  const [procurementCost, setProcurementCost] = useState(product.procurementCost ?? 0);

  // Channels
  const [syncStorefront, setSyncStorefront] = useState(product.storefrontSync ?? true);
  const [codActive, setCodActive] = useState(product.codActive ?? true);
  const [expressShip, setExpressShip] = useState(product.expressShip ?? true);

  // Media assets
  const [mediaAssets, setMediaAssets] = useState(product.mediaAssets || []);

  // Sync state when selected product changes
  useEffect(() => {
    if (product) {
      setTitle(product.title || '');
      setBrand(product.brand || 'Everwear Atelier');
      setCollection(product.collection || 'Autumn / Festive 24');
      setStyleCode(product.styleCode || product.handle || 'EVR-STYLE-01');
      setDepartment(product.department || 'Women');
      setCategory(product.category || 'Dresses & Jumpsuits');
      setFabric(product.fabricComposition || '100% Organic Cotton');
      setSilhouette(product.silhouette || 'Flared Silhouette');
      setPattern(product.pattern || 'Artisan Craft');
      setWashCare(product.washCare || 'Dry Clean Only');
      setOrigin(product.origin || 'Jaipur Craft Guild, India');
      setHsnCode(product.hsnCode || '6204.49.00');
      setGstRate(product.gstRate || 12);
      setMrp(product.mrp ?? 0);
      setB2cPrice(product.b2cPrice ?? 0);
      setProcurementCost(product.procurementCost ?? 0);
      setMediaAssets(product.mediaAssets || (product.thumbnail ? [{ slot: 'Primary Editorial', url: product.thumbnail, isPrimary: true }] : []));
    }
  }, [product]);

  // TanStack Query: catalog products and mutations
  const {
    data: catalogData,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
    error: catalogError,
    refetch: refetchCatalog,
  } = useProductsQuery({ limit: 100 });
  const updateProductMutation = useUpdateProductMutation();
  const { data: categoriesData } = useCategoriesQuery();
  const categoryNames = useMemo(
    () => new Map((categoriesData?.categories ?? []).map((c) => [c.id, c.name])),
    [categoriesData]
  );

  // Sync products when query cache updates
  useEffect(() => {
    if (catalogData?.products && catalogData.products.length > 0) {
      const apiProducts = catalogData.products.map((p, idx) => {
        const firstPrice = p.variants?.[0]?.prices?.inr || 0;
        const priceINR = firstPrice > 1000 ? Math.round(firstPrice / 100) : firstPrice;
        return {
          id: p.id,
          styleCode: p.handle ? p.handle.toUpperCase() : `EVR-SKU-${idx + 1}`,
          title: p.title,
          brand: 'Everwear Atelier',
          collection: 'Autumn / Festive 24',
          department: idx % 2 === 0 ? 'Women' : 'Men',
          categoryIds: p.categoryIds ?? [],
          category: (p.categoryIds ?? []).map((id) => categoryNames.get(id)).filter(Boolean).join(', '),
          fabricComposition: p.material || 'Premium Woven Fabric',
          silhouette: 'Tailored Fit',
          pattern: 'Solid / Subtle Texture',
          washCare: 'Dry Clean Recommended',
          origin: 'India Atelier Workshop',
          hsnCode: '6204.49.00',
          gstRate: 12,
          // The catalog API carries a selling price only. MRP and cost are
          // entered here; they used to be invented as 1.4x and 0.4x the price.
          mrp: 0,
          b2cPrice: priceINR,
          procurementCost: 0,
          storefrontSync: p.status === 'published',
          codActive: true,
          expressShip: true,
          thumbnail: p.thumbnail || p.images?.[0] || null,
          mediaAssets: p.images && p.images.length > 0
            ? p.images.map((img, i) => ({ slot: `Perspective ${i + 1}`, url: img, path: img, isPrimary: i === 0 }))
            : p.thumbnail
              ? [{ slot: 'Primary Editorial', url: p.thumbnail, path: p.thumbnail, isPrimary: true }]
              : [],
          rawBackend: p
        };
      });
      setAllProducts(apiProducts);
    }
  }, [catalogData]);

  /** The stat band, counted off the API payload rather than written in. The
      row mapper above drops `status` and `variants` and substitutes a stock
      thumbnail, so counting from it would answer the wrong question. */
  const catalogStats = useMemo(() => {
    const rows = catalogData?.products ?? [];
    const variants = rows.flatMap((p) => p.variants ?? []);
    const tracked = variants.filter((v) => v.manageInventory);
    return {
      published: rows.filter((p) => p.status === 'published').length,
      draft: rows.filter((p) => p.status === 'draft').length,
      variants: variants.length,
      tracked: tracked.length,
      outOfStock: tracked.filter((v) => (v.stock ?? 0) <= 0).length,
      noImage: rows.filter((p) => !p.thumbnail && !(p.images ?? []).length).length,
    };
  }, [catalogData]);


  // Keep a real selection as the catalog loads or the list changes under it.
  useEffect(() => {
    if (!allProducts.length) {
      if (selectedProductId) setSelectedProductId(null);
      return;
    }
    if (!allProducts.some((p) => p.id === selectedProductId)) {
      setSelectedProductId(allProducts[0].id);
    }
  }, [allProducts, selectedProductId]);

  /**
   * One chip per category that has products in it, counted from the catalog.
   * The chips used to be four fixed labels derived from a product's position
   * in the array, with counts that fell back to 14, 18, 12 and 6, so they
   * never added up to the catalog and the filter narrowed by a label no
   * product really carried.
   */
  const categoryChips = useMemo(() => {
    const counts = new Map();
    for (const product of allProducts) {
      for (const id of product.categoryIds ?? []) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return [
      { id: 'All', label: 'All', count: allProducts.length },
      ...[...counts.entries()]
        .map(([id, count]) => ({ id, label: categoryNames.get(id) ?? 'Uncategorised', count }))
        .filter((c) => c.label !== 'Uncategorised')
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    ];
  }, [allProducts, categoryNames]);

  // Filtered styles based on activeCategory
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return allProducts;
    return allProducts.filter((p) => (p.categoryIds ?? []).includes(activeCategory));
  }, [allProducts, activeCategory]);

  // Calculations
  const grossMargin = b2cPrice - procurementCost;
  const hasMargin = b2cPrice > 0 && procurementCost > 0;
  const grossMarginPercent = hasMargin ? ((grossMargin / b2cPrice) * 100).toFixed(1) : null;
  const discountDepth = mrp > 0 && b2cPrice > 0 ? Math.round(((mrp - b2cPrice) / mrp) * 100) : null;

  // Tax calculations
  const taxableValue = (b2cPrice / (1 + (gstRate / 100)));
  const cgstAmount = ((taxableValue * (gstRate / 2)) / 100).toFixed(2);
  const sgstAmount = cgstAmount;
  const igstAmount = ((taxableValue * gstRate) / 100).toFixed(2);

  const handlePublish = async () => {
    setIsSaving(true);
    try {
      // If product has a rawBackend id, send real PATCH to backend
      if (product.rawBackend?.id || product.id?.startsWith('prod_')) {
        await updateProductMutation.mutateAsync({
          productId: product.id,
          data: {
            title,
            status: 'published',
            description: `${silhouette} in ${fabric}. ${pattern}.`,
          }
        });
      }

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.8 },
        colors: themeChartColors(),
      });

      onShowToast({
        type: 'success',
        title: 'Product published',
        message: `${title} is live on the storefront.`,
        duration: 5000
      });
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Publish failed',
        message: err?.message || `${title} could not be published. Nothing was changed.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      if (product.rawBackend?.id || product.id?.startsWith('prod_')) {
        await updateProductMutation.mutateAsync({
          productId: product.id,
          data: {
            title,
            status: 'draft',
          }
        });
      }
      onShowToast({
        type: 'info',
        title: 'Draft saved',
        message: `${title} is saved as a draft and hidden from the storefront.`,
      });
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Could not save draft',
        message: err?.message || `${title} was not saved.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewStyle = () => {
    const newId = `EVR-NEW-${Date.now().toString().slice(-4)}`;
    const newProd = {
      id: newId,
      styleCode: newId,
      title: 'New product',
      brand: 'Everwear Atelier',
      collection: 'Festive / Spring 25',
      department: 'Women',
      category: "Women's Western",
      fabricComposition: '100% Mulberry Silk Crepe',
      silhouette: 'Pleated Slip Dress',
      pattern: 'Artisan Solid Dye',
      washCare: 'Dry Clean Only',
      origin: 'Jaipur Guild, India',
      hsnCode: '6204.49.00',
      gstRate: 12,
      mrp: 0,
      b2cPrice: 0,
      procurementCost: 0,
      storefrontSync: true,
      codActive: true,
      expressShip: true,
      thumbnail: null,
      mediaAssets: []
    };

    setAllProducts([newProd, ...allProducts]);
    setSelectedProductId(newId);
    onShowToast({
      type: 'info',
      title: 'New product started',
      message: 'Fill in the details. This style stays in the browser until it exists in the catalog.',
    });
  };

  const isUploading = uploads.some((u) => u.status === 'uploading');

  /**
   * Whether anything is actually waiting to be saved. The bar used to read
   * "Unsaved changes stay local" from the moment the page opened and kept
   * every action enabled, so Publish was always offered even when it would
   * send the product's own saved values straight back.
   *
   * Only the title and the composed description travel with Publish and Save
   * draft; images are written as they upload, which is why they are not part
   * of this.
   */
  const canSaveProduct = Boolean(product.rawBackend?.id || product.id?.startsWith('prod_'));
  const composedDescription = `${silhouette} in ${fabric}. ${pattern}.`;
  const isDirty =
    canSaveProduct &&
    (title.trim() !== (product.title ?? '').trim() ||
      composedDescription !== (product.rawBackend?.description ?? ''));
  const savedStatus = product.rawBackend?.status ?? null;
  const canPublish = canSaveProduct && (isDirty || savedStatus !== 'published');
  const canSaveDraft = canSaveProduct && (isDirty || savedStatus !== 'draft');

  /** The backend id to PATCH, or null when this row only exists in the client. */
  const backendProductId = product.rawBackend?.id || (product.id?.startsWith('prod_') ? product.id : null);

  /** `/uploads/...` for assets we host, which is what the products API stores. */
  const assetPath = (asset) => asset.path || asset.url;

  /**
   * Writes the image list onto the product so an upload survives a refresh.
   * Throws on failure, so the caller can keep the tile in an error state
   * rather than claiming the asset was saved.
   */
  const persistImages = async (assets) => {
    if (!backendProductId) return;
    await updateProductMutation.mutateAsync({
      productId: backendProductId,
      data: { images: assets.map(assetPath).filter(Boolean) },
    });
  };

  const runUpload = async (file, uploadId) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === uploadId ? { ...u, status: 'uploading', progress: 0, error: null } : u))
    );

    try {
      const res = await adminApi.uploadImage(file, {
        onProgress: (percent) =>
          setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: percent } : u))),
      });

      const asset = {
        slot: `Perspective ${mediaAssets.length + 1}`,
        url: res.url,
        path: res.path,
        isPrimary: mediaAssets.length === 0,
      };
      const next = [...mediaAssets, asset];
      await persistImages(next);

      setMediaAssets(next);
      setUploads((prev) => {
        prev.filter((u) => u.id === uploadId).forEach((u) => URL.revokeObjectURL(u.previewUrl));
        return prev.filter((u) => u.id !== uploadId);
      });
      onShowToast({
        type: 'success',
        title: 'Image saved',
        message: `${file.name} is now on this product.`,
      });
    } catch (err) {
      // The asset is deliberately not added: saying it saved when it did not
      // is worse than showing the failure. Previously saved images are
      // untouched, so a failed replacement leaves the product as it was.
      setUploads((prev) =>
        prev.map((u) =>
          u.id === uploadId
            ? { ...u, status: 'error', error: err?.message || 'The image could not be uploaded.' }
            : u
        )
      );
      onShowToast({
        type: 'error',
        title: 'Upload failed',
        message: err?.message || `${file.name} could not be uploaded.`,
      });
    }
  };

  /** Writes changed variant stock onto the product. */
  /** Puts every field back to what the loaded product says. */
  const handleDiscardDraft = () => {
    setTitle(product.title || '');
    setBrand(product.brand || 'Everwear Atelier');
    setCollection(product.collection || 'Autumn / Festive 24');
    setStyleCode(product.styleCode || product.handle || 'EVR-STYLE-01');
    setDepartment(product.department || 'Women');
    setCategory(product.category || 'Dresses & Jumpsuits');
    setFabric(product.fabricComposition || '100% Organic Cotton');
    setSilhouette(product.silhouette || 'Flared Silhouette');
    setPattern(product.pattern || 'Artisan Craft');
    setWashCare(product.washCare || 'Dry Clean Only');
    setOrigin(product.origin || 'Jaipur Craft Guild, India');
    setHsnCode(product.hsnCode || '6204.49.00');
    setGstRate(product.gstRate || 12);
    setMrp(product.mrp ?? 0);
    setB2cPrice(product.b2cPrice ?? 0);
    setProcurementCost(product.procurementCost ?? 0);
    setMediaAssets(product.mediaAssets || []);
    onShowToast({
      type: 'info',
      title: 'Draft discarded',
      message: `${product.title} is back to its saved values.`,
    });
  };

  const handleSaveStock = async (variantChanges, onDone) => {
    if (!backendProductId || !variantChanges.length) return;
    try {
      await updateProductMutation.mutateAsync({
        productId: backendProductId,
        data: { variants: variantChanges },
      });
      onDone?.();
      onShowToast({
        type: 'success',
        title: 'Stock updated',
        message: `Saved ${variantChanges.length} variant${variantChanges.length === 1 ? '' : 's'}.`,
      });
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Stock not saved',
        message: err?.message || 'The stock change was rejected. Nothing was changed.',
      });
    }
  };

  /** Writes the storefront-facing fields the product page reads. */
  const handleSaveStorefront = async (fields) => {
    if (!backendProductId) return;
    try {
      await updateProductMutation.mutateAsync({ productId: backendProductId, data: fields });
      onShowToast({
        type: 'success',
        title: 'Storefront fields saved',
        message: `${title} is now at /products/${fields.handle}.`,
      });
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Not saved',
        message: err?.message || 'The storefront fields were rejected. Nothing was changed.',
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    // Reset the input so choosing the same file again still fires a change.
    e.target.value = '';
    if (!file) return;

    const problem = describeUploadProblem(file);
    if (problem) {
      onShowToast({ type: 'error', title: 'Unsupported image', message: problem });
      return;
    }

    // Guard against the same file being queued twice by a double click.
    const duplicate = uploads.some(
      (u) => u.status === 'uploading' && u.name === file.name && u.size === file.size
    );
    if (duplicate) return;

    const uploadId = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setUploads((prev) => [
      ...prev,
      {
        id: uploadId,
        name: file.name,
        size: file.size,
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: 'uploading',
        error: null,
      },
    ]);
    await runUpload(file, uploadId);
  };

  const retryUpload = (uploadId) => {
    const entry = uploads.find((u) => u.id === uploadId);
    if (entry) runUpload(entry.file, uploadId);
  };

  const dismissUpload = (uploadId) => {
    setUploads((prev) => {
      prev.filter((u) => u.id === uploadId).forEach((u) => URL.revokeObjectURL(u.previewUrl));
      return prev.filter((u) => u.id !== uploadId);
    });
  };

  const handleExportCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,StyleCode,Title,Brand,MRP,SellingPrice,ProcurementCost,HSN,GST\n" +
      `${styleCode},"${title}","${brand}",${mrp},${b2cPrice},${procurementCost},${hsnCode},${gstRate}%\n`;
    const encoded = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `${styleCode}_Catalog_Master.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    onShowToast({
      type: 'success',
      title: 'CSV exported',
      message: `Downloaded the spec sheet for ${styleCode}.`,
    });
  };

  const tabs = [
    { id: 1, label: '1. Basic Details', icon: 'tune' },
    { id: 2, label: '2. Images & Media', icon: 'photo_library' },
    { id: 3, label: '3. Size & Colour Variants', icon: 'grid_view' },
    { id: 4, label: '4. Pricing & MRP', icon: 'currency_rupee' },
    { id: 5, label: '5. HSN & GST Setup', icon: 'receipt' },
    { id: 6, label: '6. Stock Allocation', icon: 'warehouse' },
    { id: 7, label: '7. Storefront & SEO', icon: 'language' },
  ];

  const pageHeader = (
    <PageHeader
      kicker="Catalog & inventory"
      title="Products"
      description="Styles, variants, pricing and stock."
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 h-9"
            type="button"
          >
            <Icon name="file_download" className="material-symbols-outlined text-icon-md" />
            <span>Export CSV</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddNewStyle}
            className="gap-1.5 h-9 shadow-sm"
            type="button"
          >
            <Icon name="add_circle" className="material-symbols-outlined text-icon-md" />
            <span>Add New Style</span>
          </Button>
        </>
      }
    />
  );

  if (isCatalogLoading) {
    return <SkeletonPage variant="cards" stats={6} statsCols={6} label="Loading product catalog" />;
  }

  if (!isCatalogError && !allProducts.length) {
    return (
      <PageContainer>
        {pageHeader}
        <EmptyState
          icon="inventory_2"
          title="No products yet"
          description="Products created in the catalog will appear here, ready to edit and publish."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Context Breadcrumb & Editorial Header */}
      {pageHeader}
      <PageBody
        error={catalogError}
        hasData={catalogData != null}
        title="Product catalog could not be loaded"
        onRetry={refetchCatalog}
      >

        {/* Operational Stat Band */}
        <ContentGrid cols={5}>
          <StatsCard
            title="Total products"
            value={allProducts.length}
            icon="checkroom"
            badge={`${catalogStats.published} published`}
            badgeVariant="info"
          />

          <StatsCard
            title="Variants (SKUs)"
            value={catalogStats.variants.toLocaleString('en-IN')}
            icon="view_in_ar"
            iconColor="text-accent"
            badge={`${catalogStats.tracked} stock-tracked`}
            badgeVariant="info"
          />

          <StatsCard
            title="Draft catalog"
            value={String(catalogStats.draft)}
            icon="edit_note"
            iconColor="text-muted"
            badge="Not on the storefront"
            badgeVariant="secondary"
          />

          <StatsCard
            className="hover:border-status-danger/40"
            title="Out of stock"
            value={String(catalogStats.outOfStock)}
            icon="inventory_2"
            iconColor="text-danger"
            badge="Tracked variants at zero"
            badgeVariant="destructive"
          />

          <StatsCard
            className="hover:border-status-warning/40"
            title="Missing imagery"
            value={String(catalogStats.noImage)}
            icon="photo_camera"
            iconColor="text-warning"
            badge="Products with no image"
            badgeVariant="warning"
          />
        </ContentGrid>

        {/* Category filter and the style being edited */}
        <FilterBar
          tabs={categoryChips}
          activeTab={activeCategory}
          onTabChange={setActiveCategory}
          filters={
            <Select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              aria-label="Product to edit"
              wrapperClassName="w-full sm:w-auto"
              className="w-full sm:w-56"
              options={filteredProducts.map((p) => ({
                value: p.id,
                label: `${p.styleCode || p.id} — ${p.title}`,
              }))}
            />
          }
        />

        {/* Editor */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex flex-col items-start justify-between gap-space-md border-b border-subtle p-space-md md:flex-row md:items-center">
            <div className="flex min-w-0 items-center gap-space-md">
              <Thumbnail
                src={product.thumbnail || mediaAssets[0]?.url || null}
                alt=""
                className="h-16 w-12 rounded-lg"
                imgClassName="object-cover"
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 items-center gap-space-sm">
                  <h2 className="truncate text-heading text-primary">{title}</h2>
                  {savedStatus && <StatusBadge status={savedStatus === 'published' ? 'Published' : 'Draft'} />}
                </div>
                <div className="flex flex-wrap items-center gap-x-space-md gap-y-0.5 text-meta text-muted">
                  <span>
                    Style code <span className="whitespace-nowrap font-mono text-secondary">{styleCode}</span>
                  </span>
                  {Array.isArray(product.rawBackend?.variants) && (
                    <span className="tabular-nums">
                      {product.rawBackend.variants.length} variant{product.rawBackend.variants.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {grossMarginPercent !== null && (
              <div className="flex flex-col md:items-end">
                <span className="text-meta text-muted">Gross margin</span>
                <span className="text-kpi-sm tabular-nums text-primary">{grossMarginPercent}%</span>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)}>
            <TabsList className="px-space-md">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-space-sm">
                  <Icon name={tab.icon} aria-hidden="true" className="material-symbols-outlined text-icon" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* One panel per tab. Every tab owns its content; before this the
              panels were all rendered at once and the tabs only moved a
              highlight. */}
          <div data-testid="product-tab-panel" className="bg-surface-canvas p-space-md">
            {activeTab === 1 && (
              <div className="grid grid-cols-1 gap-space-md xl:grid-cols-12">
                <div className="flex flex-col gap-space-md xl:col-span-7">
              <SectionCard
                title="Garment identification"
                description="What the customer sees and how the style is filed."
                contentClassName="flex flex-col gap-space-md"
              >

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="product-title"
                      className="block text-label text-primary"
                    >
                      Product title
                    </label>
                    <Input
                      id="product-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-label text-primary">
                        Brand
                      </label>
                      <Select
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                      >
                        <option>Everwear Signature Label</option>
                        <option>Everwear Atelier</option>
                        <option>Everwear Studio Casuals</option>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-label text-primary">
                        Collection
                      </label>
                      <Input
                        type="text"
                        value={collection}
                        onChange={(e) => setCollection(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-label text-primary">
                        Style code
                      </label>
                      <Input
                        type="text"
                        value={styleCode}
                        onChange={(e) => setStyleCode(e.target.value)}
                        className="font-mono whitespace-nowrap"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-label text-primary">
                        Department
                      </label>
                      <Select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      >
                        <option>Women</option>
                        <option>Men</option>
                        <option>Unisex</option>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-label text-primary">
                        Category
                      </label>
                      <Select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option>Dresses & Jumpsuits</option>
                        <option>Kurtas & Tunics</option>
                        <option>Blazers & Coats</option>
                        <option>Pants & Trousers</option>
                        <option>Shirts & Tops</option>
                      </Select>
                    </div>
                  </div>
              </SectionCard>
                </div>
                <div className="flex flex-col gap-space-md xl:col-span-5">
              <SectionCard
                title="Material, fit and origin"
                description="Printed on the product page and the care label."
                contentClassName="flex flex-col gap-space-md"
              >

                  <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-label text-primary">
                        Fabric composition
                      </label>
                      <Input
                        type="text"
                        value={fabric}
                        onChange={(e) => setFabric(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-label text-primary">
                        Silhouette or fit
                      </label>
                      <Input
                        type="text"
                        value={silhouette}
                        onChange={(e) => setSilhouette(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-label text-primary">
                        Pattern
                      </label>
                      <Input
                        type="text"
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-label text-primary">
                        Wash care
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={washCare}
                          onChange={(e) => setWashCare(e.target.value)}
                          className="pr-9"
                        />
                        <Icon name="local_laundry_service" aria-hidden="true" className="material-symbols-outlined text-icon-md text-muted absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-label text-primary">
                        Country of origin
                      </label>
                      <Input
                        type="text"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                      />
                    </div>
                  </div>
              </SectionCard>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="flex flex-col gap-space-md">
              <SectionCard
                title="Studio 360° photography"
                description="PNG, JPEG or WebP, up to 5 MB. The first image becomes the thumbnail."
                contentClassName="flex flex-col gap-space-md"
                action={
                  <label
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    )}
                  >
                    <Icon name="add_photo_alternate" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                    <span>{isUploading ? 'Uploading…' : 'Upload photo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                }
              >

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-sm">
                    {mediaAssets.map((asset, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveMediaSlot(asset)}
                        className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg border border-subtle bg-surface-subtle transition-colors hover:border-strong"
                      >
                        <Thumbnail src={asset.url} alt={asset.slot} className="w-full h-full" imgClassName="object-cover" />
                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-scrim/70 via-transparent to-transparent p-space-sm">
                          <span className="truncate text-micro text-on-accent">
                            {asset.slot}
                          </span>
                          {asset.isPrimary && (
                            <span className="mt-0.5 w-fit rounded-full bg-status-success-solid px-1.5 py-px text-micro text-on-accent">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {uploads.map((upload) => (
                      <div
                        key={upload.id}
                        className={cn(
                          'relative aspect-[3/4] overflow-hidden rounded-lg border bg-surface-subtle',
                          upload.status === 'error' ? 'border-status-danger/50' : 'border-subtle'
                        )}
                      >
                        <img
                          src={upload.previewUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-full w-full object-cover opacity-40"
                        />
                        <div className="absolute inset-0 flex flex-col justify-end gap-1 bg-scrim/70 p-space-sm">
                          <span className="truncate text-micro text-on-accent">{upload.name}</span>
                          {upload.status === 'uploading' ? (
                            <>
                              <span className="text-micro text-on-accent" role="status">
                                {upload.progress === null ? 'Uploading' : `Uploading ${upload.progress}%`}
                              </span>
                              <div className="h-1 w-full overflow-hidden rounded-full bg-on-status/30">
                                <div
                                  className={cn(
                                    'h-full rounded-full bg-status-success-solid',
                                    upload.progress === null && 'w-1/3 animate-pulse'
                                  )}
                                  style={
                                    upload.progress === null ? undefined : { width: `${upload.progress}%` }
                                  }
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="text-micro text-on-accent">{upload.error}</span>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => retryUpload(upload.id)}
                                  className="h-6 px-2 text-micro"
                                >
                                  Retry
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => dismissUpload(upload.id)}
                                  className="h-6 px-2 text-micro text-on-accent hover:bg-on-status/20 hover:text-on-accent"
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {mediaAssets.length === 0 && uploads.length === 0 && (
                    <EmptyState
                      icon="photo_library"
                      title="No images yet"
                      description="Upload a photo to give this product a thumbnail."
                    />
                  )}
              </SectionCard>
              </div>
            )}

            {activeTab === 3 && <VariantMatrixPanel product={product} />}

            {activeTab === 4 && (
              <SectionCard
                title="Commercial pricing"
                description="The selling price comes from the catalog. MRP and cost are for your margin check."
                contentClassName="flex flex-col gap-space-md"
                action={grossMarginPercent !== null ? <Badge variant="success">{grossMarginPercent}% margin</Badge> : null}
              >
                <div className="grid grid-cols-1 gap-space-md sm:grid-cols-3">
                  {[
                    { id: 'product-mrp', label: 'MRP', value: mrp, set: setMrp },
                    { id: 'product-price', label: 'Selling price', value: b2cPrice, set: setB2cPrice },
                    { id: 'product-cost', label: 'Procurement cost', value: procurementCost, set: setProcurementCost },
                  ].map((field) => (
                    <div key={field.id} className="flex flex-col gap-1.5">
                      <label htmlFor={field.id} className="block text-label text-primary">
                        {field.label}
                      </label>
                      <div className="relative">
                        <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-muted">₹</span>
                        <Input
                          id={field.id}
                          type="number"
                          min="0"
                          placeholder="Not set"
                          value={field.value || ''}
                          onChange={(e) => field.set(Number(e.target.value))}
                          className="pl-7 tabular-nums"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <dl className="flex flex-col gap-space-sm rounded-lg border border-subtle bg-surface-subtle p-space-md text-body">
                  <div className="flex justify-between gap-space-md">
                    <dt className="text-secondary">Discount from MRP</dt>
                    <dd className="tabular-nums text-primary">{discountDepth === null ? '—' : `${discountDepth}%`}</dd>
                  </div>
                  <div className="flex justify-between gap-space-md">
                    <dt className="text-secondary">Gross profit per piece</dt>
                    <dd className="whitespace-nowrap tabular-nums text-primary">
                      {hasMargin ? `₹${grossMargin.toFixed(2)}` : '—'}
                    </dd>
                  </div>
                </dl>
              </SectionCard>
            )}

            {activeTab === 5 && (
              <SectionCard
                title="Statutory HSN and GST split"
                description="How the selling price divides into taxable value and GST."
                contentClassName="flex flex-col gap-space-md"
              >
                <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="product-hsn" className="block text-label text-primary">
                      HSN code
                    </label>
                    <Input
                      id="product-hsn"
                      type="text"
                      value={hsnCode}
                      onChange={(e) => setHsnCode(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="product-gst" className="block text-label text-primary">
                      GST rate
                    </label>
                    <Select
                      id="product-gst"
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                    >
                      <option value={5}>5% (garments under ₹1,000)</option>
                      <option value={12}>12% (apparel over ₹1,000)</option>
                      <option value={18}>18% (luxury fabrics and accessories)</option>
                    </Select>
                  </div>
                </div>

                <dl className="flex flex-col gap-space-sm rounded-lg border border-subtle bg-surface-subtle p-space-md text-body">
                  <div className="flex justify-between gap-space-md">
                    <dt className="text-secondary">Taxable value</dt>
                    <dd className="whitespace-nowrap tabular-nums text-primary">₹{taxableValue.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between gap-space-md">
                    <dt className="text-secondary">CGST, intra-state ({gstRate / 2}%)</dt>
                    <dd className="whitespace-nowrap tabular-nums text-primary">₹{cgstAmount}</dd>
                  </div>
                  <div className="flex justify-between gap-space-md">
                    <dt className="text-secondary">SGST, intra-state ({gstRate / 2}%)</dt>
                    <dd className="whitespace-nowrap tabular-nums text-primary">₹{sgstAmount}</dd>
                  </div>
                  <div className="flex justify-between gap-space-md border-t border-subtle pt-space-sm">
                    <dt className="text-secondary">IGST, inter-state ({gstRate}%)</dt>
                    <dd className="whitespace-nowrap font-semibold tabular-nums text-primary">₹{igstAmount}</dd>
                  </div>
                </dl>
              </SectionCard>
            )}

            {activeTab === 6 && (
              <StockAllocationPanel
                product={product}
                onSave={handleSaveStock}
                isSaving={updateProductMutation.isPending}
              />
            )}

            {activeTab === 7 && (
              <StorefrontSeoPanel
                product={product}
                title={title}
                description={product.rawBackend?.description ?? ''}
                onSave={handleSaveStorefront}
                isSaving={updateProductMutation.isPending}
              />
            )}
          </div>


          {/* Save bar */}
          <div className="sticky bottom-0 z-30 flex flex-col items-stretch justify-between gap-space-md border-t border-subtle bg-surface-container-lowest p-space-md sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-label text-primary">
                {updateProductMutation.isPending
                  ? 'Saving changes'
                  : isDirty
                    ? 'Unsaved changes'
                    : 'All changes saved'}
              </span>
              <span className="text-meta text-muted">
                {isDirty
                  ? 'Save as a draft or publish to keep them.'
                  : canSaveProduct
                    ? `This style is ${savedStatus === 'published' ? 'published' : 'a draft'}.`
                    : 'This style only exists in the browser and cannot be saved.'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-space-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscardDraft}
                disabled={!isDirty || isSaving}
                className="text-danger hover:bg-status-danger-bg hover:text-danger"
              >
                Discard draft
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSaving || !canSaveDraft}
              >
                Save as draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePublish}
                disabled={isSaving || !canPublish}
              >
                <Icon name="rocket_launch" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                <span>{isSaving ? 'Publishing…' : 'Publish'}</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Image preview */}
        <AppDialog
          isOpen={!!activeMediaSlot}
          onClose={() => setActiveMediaSlot(null)}
          title={activeMediaSlot ? `${title} · ${activeMediaSlot.slot}` : ''}
          maxWidth="max-w-2xl"
        >
          {activeMediaSlot && (
            <Thumbnail
              src={activeMediaSlot.url}
              alt={activeMediaSlot.slot}
              className="h-[70vh] w-full rounded-lg"
              imgClassName="object-contain"
            />
          )}
        </AppDialog>
      </PageBody>
    </PageContainer>
  );
}
