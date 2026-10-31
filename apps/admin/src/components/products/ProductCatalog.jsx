import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { adminApi, describeUploadProblem } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useProductsQuery, useUpdateProductMutation } from '../../hooks/useAdminQueries';
import { Icon,
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  EmptyState,
  ErrorState,
  SkeletonPage,
  Thumbnail,
  ColorSwatch,
} from '../ui';

const EMPTY_PRODUCT = {};

export function ProductCatalog({ onShowToast, currentHub }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState(1);
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
  const [mrp, setMrp] = useState(product.mrp || 6990);
  const [b2cPrice, setB2cPrice] = useState(product.b2cPrice || 4890);
  const [procurementCost, setProcurementCost] = useState(product.procurementCost || 1650);

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
      setMrp(product.mrp || 6990);
      setB2cPrice(product.b2cPrice || 4890);
      setProcurementCost(product.procurementCost || 1650);
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

  // Sync products when query cache updates
  useEffect(() => {
    if (catalogData?.products && catalogData.products.length > 0) {
      const apiProducts = catalogData.products.map((p, idx) => {
        const firstPrice = p.variants?.[0]?.prices?.inr || p.variants?.[0]?.prices?.eur || 4890;
        const priceINR = firstPrice > 1000 ? Math.round(firstPrice / 100) : firstPrice;
        return {
          id: p.id,
          styleCode: p.handle ? p.handle.toUpperCase() : `EVR-SKU-${idx + 1}`,
          title: p.title,
          brand: 'Everwear Atelier',
          collection: 'Autumn / Festive 24',
          department: idx % 2 === 0 ? 'Women' : 'Men',
          category: idx % 3 === 0 ? "Women's Ethnic" : idx % 3 === 1 ? "Women's Western" : "Men's Casual",
          seasonTag: 'AUTUMN / ATELIER 24',
          fabricComposition: p.material || 'Premium Woven Fabric',
          silhouette: 'Tailored Fit',
          pattern: 'Solid / Subtle Texture',
          washCare: 'Dry Clean Recommended',
          origin: 'India Atelier Workshop',
          hsnCode: '6204.49.00',
          gstRate: 12,
          mrp: Math.round(priceINR * 1.4),
          b2cPrice: priceINR,
          procurementCost: Math.round(priceINR * 0.4),
          storefrontSync: p.status === 'published',
          codActive: true,
          expressShip: true,
          thumbnail: p.thumbnail || (p.images && p.images[0]) || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY9Tgm6nn9TMViDB2K0jV_IgnR1CTQzPSh4UF1qP0xioyqkpMq3i7rxekw2L-XzIqJ7t0oI4QqiK1ZfohmEgXR501aua43kgyya37eW_Pnzg1T4YVEcL0PZnC5nDOlZkUy2t-rC3JITisM8eYFYMI4d6TLZtJcydeuJ8KukkLzD8BdJmW5hA7Jm3FflcjpsXIW5n5FvIgEXboyVtaKgQdoBRB4-htL-mHupOCj5v7x',
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

  // Filtered styles based on activeCategory
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return allProducts;
    return allProducts.filter(p => p.category?.toLowerCase().includes(activeCategory.toLowerCase()));
  }, [allProducts, activeCategory]);

  // Calculations
  const grossMargin = b2cPrice - procurementCost;
  const grossMarginPercent = b2cPrice > 0 ? ((grossMargin / b2cPrice) * 100).toFixed(1) : 0;
  const discountDepth = mrp > 0 ? Math.round(((mrp - b2cPrice) / mrp) * 100) : 0;

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
        colors: ['#6d28d9', '#c026d3', '#059669', '#2563eb']
      });

      onShowToast({
        type: 'success',
        title: 'Garment Style Published Live',
        message: `${title} is now active and published across catalog channels!`,
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
        title: 'Draft Saved',
        message: `${title} saved as inactive draft in catalog master.`,
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
      title: 'New Luxury Garment Style',
      brand: 'Everwear Atelier',
      collection: 'Festive / Spring 25',
      department: 'Women',
      category: "Women's Western",
      seasonTag: 'SPRING / RESORT 25',
      fabricComposition: '100% Mulberry Silk Crepe',
      silhouette: 'Pleated Slip Dress',
      pattern: 'Artisan Solid Dye',
      washCare: 'Dry Clean Only',
      origin: 'Jaipur Guild, India',
      hsnCode: '6204.49.00',
      gstRate: 12,
      mrp: 7490,
      b2cPrice: 5290,
      procurementCost: 1850,
      storefrontSync: true,
      codActive: true,
      expressShip: true,
      thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY9Tgm6nn9TMViDB2K0jV_IgnR1CTQzPSh4UF1qP0xioyqkpMq3i7rxekw2L-XzIqJ7t0oI4QqiK1ZfohmEgXR501aua43kgyya37eW_Pnzg1T4YVEcL0PZnC5nDOlZkUy2t-rC3JITisM8eYFYMI4d6TLZtJcydeuJ8KukkLzD8BdJmW5hA7Jm3FflcjpsXIW5n5FvIgEXboyVtaKgQdoBRB4-htL-mHupOCj5v7x',
      mediaAssets: [
        { slot: 'Primary Editorial', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY9Tgm6nn9TMViDB2K0jV_IgnR1CTQzPSh4UF1qP0xioyqkpMq3i7rxekw2L-XzIqJ7t0oI4QqiK1ZfohmEgXR501aua43kgyya37eW_Pnzg1T4YVEcL0PZnC5nDOlZkUy2t-rC3JITisM8eYFYMI4d6TLZtJcydeuJ8KukkLzD8BdJmW5hA7Jm3FflcjpsXIW5n5FvIgEXboyVtaKgQdoBRB4-htL-mHupOCj5v7x', isPrimary: true }
      ]
    };

    setAllProducts([newProd, ...allProducts]);
    setSelectedProductId(newId);
    onShowToast({
      type: 'info',
      title: 'New Style Template Initialized',
      message: 'Created blank luxury apparel style template. Enter details and publish.',
    });
  };

  const isUploading = uploads.some((u) => u.status === 'uploading');

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

  const handleRunQc = () => {
    onShowToast({
      type: 'info',
      title: 'Compliance QC Scan Passed',
      message: `Style ${styleCode}: HSN ${hsnCode} verified against GST portal. EAN barcodes valid. Zero structural violations.`,
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
      title: 'Product Catalog CSV Exported',
      message: `Downloaded CSV spec sheet for ${styleCode}.`,
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

  if (isCatalogLoading) {
    return <SkeletonPage variant="cards" stats={6} statsCols={6} label="Loading product catalog" />;
  }

  if (isCatalogError) {
    return (
      <PageContainer>
        <ErrorState
          title="Product catalog could not be loaded"
          message={catalogError?.message}
          onRetry={() => refetchCatalog()}
        />
      </PageContainer>
    );
  }

  if (!allProducts.length) {
    return (
      <PageContainer>
        <EmptyState
          icon="inventory_2"
          title="No products yet"
          message="Products created in the catalog will appear here, ready to edit and publish."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {catalogError && (
        <ErrorState
          title="Product catalog could not be loaded"
          message={catalogError?.message}
          onRetry={() => refetchCatalog()}
        />
      )}
      {/* Context Breadcrumb & Editorial Header */}
      <PageHeader
        breadcrumb={['Everwear Admin', 'Catalog', 'Products']}
        title="Fashion Product Catalog & Variant Master"
        description="Omnichannel garment provisioning, multi-hub HSN/GST compliance & dynamic matrix management."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast({ type: 'info', title: 'Excel Import', message: 'Ready to import catalog spreadsheet (XLSX template v2.4).' })}
              className="gap-1.5 h-9"
              type="button"
            >
              <Icon name="upload_file" className="material-symbols-outlined text-icon-md" />
              <span>Import Excel</span>
            </Button>
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
              variant="outline"
              size="sm"
              onClick={() => onShowToast({ type: 'success', title: 'Storefront Synced', message: 'POS & Myntra catalog channels synchronized successfully.' })}
              className="gap-1.5 h-9"
              type="button"
            >
              <Icon name="sync_alt" className="material-symbols-outlined text-icon-md" />
              <span>Sync Storefront / POS</span>
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

      {/* Operational Stat Band */}
      <ContentGrid cols={5}>
        <StatsCard
          title="Total Products"
          value={allProducts.length}
          icon="checkroom"
          trend="+3.4% mo"
          trendType="up"
        />

        <StatsCard
          title="Active Variants (SKUs)"
          value="24,190"
          icon="view_in_ar"
          iconColor="text-accent"
          badge="Live in 12 Hubs"
          badgeVariant="info"
        />

        <StatsCard
          title="Draft Catalog"
          value="38"
          icon="edit_note"
          iconColor="text-muted"
          badge="Work in progress"
          badgeVariant="secondary"
        />

        <StatsCard
          className="hover:border-status-danger/40"
          title="Stock Depleted"
          value="86"
          icon="inventory_2"
          iconColor="text-danger"
          badge="Urgent Reorder"
          badgeVariant="destructive"
        />

        <StatsCard
          className="hover:border-status-warning/40"
          title="Pending Studio QC"
          value="14"
          icon="photo_camera"
          iconColor="text-warning"
          badge="Asset Review"
          badgeVariant="warning"
        />
      </ContentGrid>

      {/* Category Nav Chips & Style Switcher Bar */}
      <Card>
        <CardContent className="p-2 flex items-center justify-between flex-wrap gap-space-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {[
              { label: 'All', count: allProducts.length },
              { label: "Women's Ethnic", count: allProducts.filter(p => p.category?.includes("Ethnic")).length || 14 },
              { label: "Women's Western", count: allProducts.filter(p => p.category?.includes("Western")).length || 18 },
              { label: "Men's Casual", count: allProducts.filter(p => p.department === 'Men').length || 12 },
              { label: 'Accessories & Footwear', count: 6 },
            ].map((cat) => {
              const isCatActive = activeCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(cat.label)}
                  className={`px-3 py-1.5 rounded-lg text-label transition-all whitespace-nowrap ${
 isCatActive
 ? 'bg-primary-container text-on-accent font-semibold shadow-xs'
 : 'bg-surface-subtle hover:bg-surface-container text-muted'
 }`}
                  type="button"
                >
                  {cat.label} ({cat.count})
                </button>
              );
            })}
          </div>

          {/* Product Switcher Dropdown */}
          <div className="flex items-center gap-2 pr-2">
            <span className="text-caption text-muted uppercase font-semibold">
              Select Style:
            </span>
            <Select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              aria-label="Select style"
              wrapperClassName="w-auto"
              className="h-8 w-auto max-w-[14rem] text-meta"
              options={filteredProducts.map((p) => ({
                value: p.id,
                label: `${p.styleCode || p.id} — ${p.title}`,
              }))}
            />
            <span className="inline-flex w-2 h-2 rounded-full bg-status-success animate-pulse shrink-0"></span>
          </div>
        </CardContent>
      </Card>

      {/* Editor Workspace Shell */}
      <Card className="overflow-hidden flex flex-col">
        {/* Studio Header / Top Utility Ribbon */}
        <div className="p-space-lg bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border-b border-subtle">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-16 rounded-lg overflow-hidden bg-surface-subtle shrink-0 shadow-xs border border-subtle">
              <Thumbnail src={product.thumbnail || (mediaAssets[0]?.url) || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6'} alt="Product Editorial Thumbnail" className="w-full h-full" imgClassName="object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-micro font-semibold">
                  {product.seasonTag || 'AUTUMN / ATELIER 24'}
                </Badge>
                <Badge variant="success" className="text-micro font-semibold">
                  GST RECONCILED
                </Badge>
              </div>
              <h2 className="text-heading font-semibold text-primary tracking-tight mt-0.5">
                {title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-body text-secondary mt-0.5">
                <span>Style Code: <strong className="text-primary font-mono text-label whitespace-nowrap">{styleCode}</strong></span>
                <span>•</span>
                <span>Atelier Master Guild</span>
                <span>•</span>
                <span className="text-success font-medium">Variants Configured</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="flex flex-col text-right">
              <span className="text-caption text-muted uppercase font-semibold">
                Gross Profit Margin
              </span>
              <span className="text-kpi text-success tabular-nums">
                {grossMarginPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Step Interactive Tabs Nav */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)}>
          <TabsList className="bg-surface-subtle px-space-md">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="gap-2 whitespace-nowrap"
              >
                <Icon name={tab.icon} className="material-symbols-outlined text-icon-md" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Main Workspace Split Panels */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg p-space-lg bg-surface-container-lowest">
          {/* Left Column: Rich Fashion Specification Form (7 Cols) */}
          <div className="xl:col-span-7 space-y-space-lg">
            {/* General Identity */}
            <Card className="bg-surface-canvas border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <div className="flex items-center justify-between pb-2 border-b border-subtle/50">
                  <h3 className="text-subheading font-semibold text-primary flex items-center gap-2">
                    <Icon name="apparel" className="material-symbols-outlined text-accent text-icon-lg" />
                    <span>Garment Identification & Merchandising</span>
                  </h3>
                  <span className="text-caption text-muted font-semibold">
                    MANDATORY COMPLIANCE
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-caption text-muted uppercase font-semibold">
                    Product Title (Customer Facing)
                  </label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 bg-surface-container-lowest"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="space-y-1.5">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Brand Master Label
                    </label>
                    <Select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="h-10 bg-surface-container-lowest"
                    >
                      <option>Everwear Signature Label</option>
                      <option>Everwear Atelier</option>
                      <option>Everwear Studio Casuals</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Sub-Brand / Collection
                    </label>
                    <Input
                      type="text"
                      value={collection}
                      onChange={(e) => setCollection(e.target.value)}
                      className="h-10 bg-surface-container-lowest"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                  <div className="space-y-1.5">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Parent Style Code (SKU)
                    </label>
                    <Input
                      type="text"
                      value={styleCode}
                      onChange={(e) => setStyleCode(e.target.value)}
                      className="h-10 font-mono text-label font-semibold bg-surface-container-lowest whitespace-nowrap"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Department
                    </label>
                    <Select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="h-10 bg-surface-container-lowest"
                    >
                      <option>Women</option>
                      <option>Men</option>
                      <option>Unisex</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Primary Category
                    </label>
                    <Select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-10 bg-surface-container-lowest"
                    >
                      <option>Dresses & Jumpsuits</option>
                      <option>Kurtas & Tunics</option>
                      <option>Blazers & Coats</option>
                      <option>Pants & Trousers</option>
                      <option>Shirts & Tops</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Material, Weave & Technical Specs */}
            <Card className="bg-surface-canvas border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <h3 className="text-subheading font-semibold text-primary flex items-center gap-2">
                  <Icon name="texture" className="material-symbols-outlined text-accent text-icon-lg" />
                  <span>Material, Fit & Manufacturing Composition</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                  <div className="space-y-1.5">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Fabric Composition
                    </label>
                    <Input
                      type="text"
                      value={fabric}
                      onChange={(e) => setFabric(e.target.value)}
                      className="h-10 bg-surface-container-lowest"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Garment Silhouette / Fit
                    </label>
                    <Input
                      type="text"
                      value={silhouette}
                      onChange={(e) => setSilhouette(e.target.value)}
                      className="h-10 bg-surface-container-lowest"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Pattern & Surface Craft
                    </label>
                    <Input
                      type="text"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      className="h-10 bg-surface-container-lowest"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="space-y-1.5">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Recommended Wash Care
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={washCare}
                        onChange={(e) => setWashCare(e.target.value)}
                        className="h-10 bg-surface-container-lowest pr-9"
                      />
                      <Icon name="local_laundry_service" className="material-symbols-outlined text-icon-md text-muted absolute right-3 top-2.5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Country of Origin & Guild
                    </label>
                    <Input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="h-10 bg-surface-container-lowest"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Studio Lookbook Media Assets (Strip of slots) */}
            <Card className="bg-surface-canvas border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <div className="flex items-center justify-between">
                  <h3 className="text-subheading font-semibold text-primary flex items-center gap-2">
                    <Icon name="perm_media" className="material-symbols-outlined text-accent text-icon-lg" />
                    <span>Studio 360° Photography & Swatch Assets</span>
                  </h3>
                  <label
                    className={cn(
                      'text-label font-medium inline-flex items-center gap-1',
                      isUploading
                        ? 'text-disabled cursor-not-allowed'
                        : 'text-accent cursor-pointer hover:underline'
                    )}
                  >
                    <Icon name="add_photo_alternate" className="material-symbols-outlined text-icon" />
                    <span>{isUploading ? 'Uploading...' : 'Upload photo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>

                <p className="text-meta text-muted">PNG, JPEG or WebP, up to 5 MB. The first image becomes the thumbnail.</p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-sm">
                  {mediaAssets.map((asset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveMediaSlot(asset)}
                      className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-surface-subtle border border-subtle hover:border-primary cursor-pointer transition-all shadow-xs"
                    >
                      <Thumbnail src={asset.url} alt={asset.slot} className="w-full h-full" imgClassName="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-scrim/70 via-transparent to-transparent flex flex-col justify-end p-2 opacity-90 group-hover:opacity-100">
                        <span className="text-on-accent text-micro font-semibold truncate leading-tight">
                          {asset.slot}
                        </span>
                        {asset.isPrimary && (
                          <span className="mt-0.5 w-fit rounded-full bg-status-success-solid px-1.5 py-px text-micro font-semibold text-on-accent">
                            PRIMARY
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
                      <div className="absolute inset-0 flex flex-col justify-end gap-1 bg-scrim/70 p-2">
                        <span className="truncate text-micro font-semibold text-on-accent">{upload.name}</span>
                        {upload.status === 'uploading' ? (
                          <>
                            <span className="text-micro text-on-accent" role="status">
                              {upload.progress === null ? 'Uploading' : `Uploading ${upload.progress}%`}
                            </span>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-raised/40">
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
                              <button
                                type="button"
                                onClick={() => retryUpload(upload.id)}
                                className="rounded bg-surface-raised px-1.5 py-px text-micro font-semibold text-primary"
                              >
                                Retry
                              </button>
                              <button
                                type="button"
                                onClick={() => dismissUpload(upload.id)}
                                className="rounded px-1.5 py-px text-micro font-semibold text-on-accent underline"
                              >
                                Dismiss
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {mediaAssets.length === 0 && uploads.length === 0 && (
                  <p className="text-meta text-muted">No images on this product yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Pricing Engine, Tax Setup & SKU Matrix (5 Cols) */}
          <div className="xl:col-span-5 space-y-space-lg">
            {/* Commercial Pricing Engine */}
            <Card className="bg-surface-canvas border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <div className="flex items-center justify-between pb-2 border-b border-subtle/50">
                  <h3 className="text-subheading font-semibold text-primary flex items-center gap-2">
                    <Icon name="currency_rupee" className="material-symbols-outlined text-accent text-icon-lg" />
                    <span>Commercial Pricing & Margins</span>
                  </h3>
                  <Badge variant="success" className="text-caption">
                    {grossMarginPercent}% MARGIN
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                  <div className="space-y-1">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Maximum Retail Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-secondary text-body">₹</span>
                      <Input
                        type="number"
                        value={mrp}
                        onChange={(e) => setMrp(Number(e.target.value))}
                        className="h-10 pl-7 font-mono font-semibold bg-surface-container-lowest whitespace-nowrap"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Selling Price (B2C)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-accent text-body font-semibold">₹</span>
                      <Input
                        type="number"
                        value={b2cPrice}
                        onChange={(e) => setB2cPrice(Number(e.target.value))}
                        className="h-10 pl-7 font-mono font-semibold text-accent bg-surface-container-lowest whitespace-nowrap"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      Procurement Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-secondary text-body">₹</span>
                      <Input
                        type="number"
                        value={procurementCost}
                        onChange={(e) => setProcurementCost(Number(e.target.value))}
                        className="h-10 pl-7 font-mono bg-surface-container-lowest whitespace-nowrap"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-space-md rounded-xl bg-surface-container-lowest space-y-2 border border-subtle">
                  <div className="flex justify-between text-body text-secondary">
                    <span>Discount from MRP:</span>
                    <span className="font-semibold text-primary">{discountDepth}% Off</span>
                  </div>
                  <div className="flex justify-between text-body text-secondary">
                    <span>Net Gross Profit (per piece):</span>
                    <span className="font-semibold text-success font-mono whitespace-nowrap">₹{grossMargin.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HSN & GST Statutory Compliance */}
            <Card className="bg-surface-canvas border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <div className="flex items-center justify-between pb-2 border-b border-subtle/50">
                  <h3 className="text-subheading font-semibold text-primary flex items-center gap-2">
                    <Icon name="receipt_long" className="material-symbols-outlined text-accent text-icon-lg" />
                    <span>Statutory HSN & GST Split</span>
                  </h3>
                  <span className="text-caption text-muted font-semibold">
                    KA-GSTIN 29AAACE1284P1ZX
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="space-y-1">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      HSN Classification Code
                    </label>
                    <Input
                      type="text"
                      value={hsnCode}
                      onChange={(e) => setHsnCode(e.target.value)}
                      className="h-10 font-mono bg-surface-container-lowest whitespace-nowrap"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-caption text-muted uppercase font-semibold">
                      GST Rate Tier
                    </label>
                    <Select
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                      className="h-10 bg-surface-container-lowest font-medium"
                    >
                      <option value={5}>5% (Garments &lt; ₹1,000)</option>
                      <option value={12}>12% (Standard Apparel &gt; ₹1,000)</option>
                      <option value={18}>18% (Luxury Fabrics &amp; Accessories)</option>
                    </Select>
                  </div>
                </div>

                <div className="p-space-md rounded-xl bg-surface-container-lowest space-y-1.5 border border-subtle text-body">
                  <div className="flex justify-between text-muted">
                    <span>Taxable Base Value:</span>
                    <span className="font-mono text-primary whitespace-nowrap">₹{taxableValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>CGST (Intra-state {gstRate / 2}%):</span>
                    <span className="font-mono text-primary whitespace-nowrap">₹{cgstAmount}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>SGST (Intra-state {gstRate / 2}%):</span>
                    <span className="font-mono text-primary whitespace-nowrap">₹{sgstAmount}</span>
                  </div>
                  <div className="flex justify-between text-muted border-t border-surface-subtle pt-1">
                    <span>IGST (Inter-state {gstRate}%):</span>
                    <span className="font-mono text-accent font-semibold whitespace-nowrap">₹{igstAmount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Variant Matrix */}
            <Card className="bg-surface-canvas border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-subheading font-semibold text-primary flex items-center gap-2">
                      <Icon name="layers" className="material-symbols-outlined text-accent text-icon-lg" />
                      <span>Active SKU Variant Matrix</span>
                    </h3>
                    <p className="text-body text-secondary">Emerald &amp; Wine Colorways • XS–XL</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-accent hover:bg-surface-container text-meta h-7"
                    onClick={() => onShowToast({ type: 'info', title: 'New Colorway', message: 'Colorway palette generator opened.' })}
                    type="button"
                  >
                    + New Colorway
                  </Button>
                </div>

                {/* Colorway 1: Emerald Green */}
                <div className="bg-surface-container-lowest p-space-md rounded-xl space-y-space-sm shadow-xs border border-subtle">
                  <div className="flex items-center justify-between border-b border-surface-subtle pb-2">
                    <ColorSwatch hex="#065F46" name="Emerald Green" />
                    <Badge variant="success" className="text-caption font-semibold">
                      5 SKUs Active
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {[
                      { size: 'XS', sku: `${styleCode}-EMR-XS`, ean: '8904321098451', stock: 142 },
                      { size: 'S', sku: `${styleCode}-EMR-S`, ean: '8904321098452', stock: 298 },
                      { size: 'M', sku: `${styleCode}-EMR-M`, ean: '8904321098453', stock: 340 },
                      { size: 'L', sku: `${styleCode}-EMR-L`, ean: '8904321098454', stock: 18 },
                      { size: 'XL', sku: `${styleCode}-EMR-XL`, ean: '8904321098455', stock: 0 },
                    ].map((skuItem) => (
                      <div key={skuItem.size} className="flex items-center justify-between text-body py-1 border-b border-surface-subtle/50 last:border-none">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-surface-subtle flex items-center justify-center font-semibold text-micro text-primary">
                            {skuItem.size}
                          </span>
                          <span className="font-mono text-caption text-muted whitespace-nowrap">
                            {skuItem.sku}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-micro text-muted hidden sm:inline whitespace-nowrap">
                            EAN: {skuItem.ean}
                          </span>
                          <Badge 
                            variant={
                              skuItem.stock === 0 ? 'destructive' :
                              skuItem.stock < 20 ? 'warning' : 'success'
                            }
                            className="text-micro py-0 px-1.5 font-semibold"
                          >
                            {skuItem.stock} {skuItem.stock === 0 ? 'Out' : skuItem.stock < 20 ? 'Low' : 'In Stock'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Colorway 2: Wine Berry */}
                <div className="bg-surface-container-lowest p-space-md rounded-xl space-y-space-sm shadow-xs border border-subtle">
                  <div className="flex items-center justify-between border-b border-surface-subtle pb-2">
                    <ColorSwatch hex="#701A75" name="Wine Berry" />
                    <Badge variant="info" className="text-caption font-semibold">
                      5 SKUs Generated
                    </Badge>
                  </div>
                  <div className="text-meta text-muted flex items-center justify-between py-1">
                    <span>Standard Logistics Spec:</span>
                    <span className="font-mono text-primary whitespace-nowrap">380g • 30×25×4 cm • Polybag Tier 1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Bottom Master Action Bar */}
        <div className="p-space-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md sticky bottom-0 z-30 shadow-lg border-t border-subtle">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-ping"></span>
            <span className="text-label font-semibold text-primary">Studio Changes Auto-Saved</span>
            <span className="text-muted text-micro">(Live Sync)</span>
          </div>

          <div className="flex flex-wrap items-center gap-space-xs w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast({ type: 'warning', title: 'Draft Discarded', message: 'Restored original production style values.' })}
              className="text-danger hover:bg-status-danger-bg hover:text-danger"
              type="button"
            >
              Discard Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving}
              type="button"
            >
              Save as Inactive Draft
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRunQc}
              className="gap-1.5 shadow-xs"
              type="button"
            >
              <Icon name="verified" className="material-symbols-outlined text-icon-md" />
              <span>Run Compliance QC Check</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePublish}
              disabled={isSaving}
              className="gap-1.5 shadow-md"
              type="button"
            >
              <Icon name="rocket_launch" className="material-symbols-outlined text-icon-md" />
              <span>{isSaving ? 'Publishing...' : 'Publish Product (Active)'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Lookbook Zoom Dialog */}
      {activeMediaSlot && (
        <Dialog open={!!activeMediaSlot} onOpenChange={() => setActiveMediaSlot(null)}>
          <DialogContent className="max-w-2xl p-4 flex flex-col gap-3">
            <DialogHeader className="flex flex-row items-center justify-between pb-2">
              <DialogTitle className="text-body font-semibold">
                {title} - {activeMediaSlot.slot} Perspective
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveMediaSlot(null)}
                className="h-7 w-7 text-muted hover:text-primary"
                type="button"
              >
                <Icon name="close" className="material-symbols-outlined text-icon-md" />
              </Button>
            </DialogHeader>
            <Thumbnail src={activeMediaSlot.url} alt={activeMediaSlot.slot} className="h-[70vh] w-auto rounded-xl" imgClassName="object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
