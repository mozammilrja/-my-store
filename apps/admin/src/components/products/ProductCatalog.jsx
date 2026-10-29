import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { INITIAL_PRODUCTS } from '../../data/mockData';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Select,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui';

export function ProductCatalog({ onShowToast, currentHub }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState(1);
  const [product, setProduct] = useState(INITIAL_PRODUCTS[0]);
  const [activeMediaSlot, setActiveMediaSlot] = useState(null);

  // Form states
  const [title, setTitle] = useState(product.title);
  const [brand, setBrand] = useState(product.brand);
  const [collection, setCollection] = useState(product.collection);
  const [styleCode, setStyleCode] = useState(product.styleCode);
  const [department, setDepartment] = useState(product.department);
  const [category, setCategory] = useState(product.category);
  const [fabric, setFabric] = useState(product.fabricComposition);
  const [silhouette, setSilhouette] = useState(product.silhouette);
  const [pattern, setPattern] = useState(product.pattern);
  const [washCare, setWashCare] = useState(product.washCare);
  const [origin, setOrigin] = useState(product.origin);
  const [hsnCode, setHsnCode] = useState(product.hsnCode);
  const [gstRate, setGstRate] = useState(product.gstRate);

  // Commercial pricing state with live calculation
  const [mrp, setMrp] = useState(product.mrp);
  const [b2cPrice, setB2cPrice] = useState(product.b2cPrice);
  const [procurementCost, setProcurementCost] = useState(product.procurementCost);

  // Channels
  const [syncStorefront, setSyncStorefront] = useState(product.storefrontSync);
  const [codActive, setCodActive] = useState(product.codActive);
  const [expressShip, setExpressShip] = useState(product.expressShip);

  // Calculations
  const grossMargin = b2cPrice - procurementCost;
  const grossMarginPercent = b2cPrice > 0 ? ((grossMargin / b2cPrice) * 100).toFixed(1) : 0;
  const discountDepth = mrp > 0 ? Math.round(((mrp - b2cPrice) / mrp) * 100) : 0;

  // Tax split calculations
  const taxableValue = (b2cPrice / (1 + (gstRate / 100)));
  const cgstAmount = ((taxableValue * (gstRate / 2)) / 100).toFixed(2);
  const sgstAmount = cgstAmount;
  const igstAmount = ((taxableValue * gstRate) / 100).toFixed(2);

  const handlePublish = () => {
    // Confetti effect
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#6d28d9', '#c026d3', '#059669', '#2563eb']
    });

    onShowToast({
      type: 'success',
      title: 'Garment Style Published Live',
      message: `${title} is now active across Myntra, Everwear Web & 12 regional fulfillment hubs!`,
      duration: 5000
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

  return (
    <div className="flex flex-col w-full space-y-space-xl">
      {/* Context Breadcrumb & Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
            <span>Everwear Admin</span>
            <span className="text-secondary/40">/</span>
            <span>Catalog</span>
            <span className="text-secondary/40">/</span>
            <span className="text-primary font-semibold">Products</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
            Fashion Product Catalog & Variant Master
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Omnichannel garment provisioning, multi-hub HSN/GST compliance & dynamic matrix management.
          </p>
        </div>

        {/* Global Catalog Action Buttons */}
        <div className="flex flex-wrap items-center gap-space-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowToast({ type: 'info', title: 'Excel Import', message: 'Ready to import catalog spreadsheet (XLSX template v2.4).' })}
            className="gap-1.5 h-9"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Import Excel</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 h-9"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            <span>Export CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowToast({ type: 'success', title: 'Storefront Synced', message: 'POS & Myntra catalog channels synchronized successfully.' })}
            className="gap-1.5 h-9"
          >
            <span className="material-symbols-outlined text-[18px]">sync_alt</span>
            <span>Sync Storefront / POS</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onShowToast({ type: 'info', title: 'New Style Generator', message: 'Initialized blank luxury apparel style template.' })}
            className="gap-1.5 h-9 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Add New Style</span>
          </Button>
        </div>
      </div>

      {/* Operational Stat Band - ReUI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-space-md">
        <Card className="hover:border-primary/30 transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary font-semibold">Total Products</span>
              <span className="p-1 rounded-lg bg-surface-subtle text-secondary material-symbols-outlined text-[18px]">checkroom</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-metric-stat text-metric-stat text-text-primary tabular-nums">4,820</span>
              <Badge variant="success" className="text-label-xs-caps">+3.4% mo</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-300 transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary font-semibold">Active Variants (SKUs)</span>
              <span className="p-1 rounded-lg bg-surface-subtle text-primary material-symbols-outlined text-[18px]">view_in_ar</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-metric-stat text-metric-stat text-text-primary tabular-nums">24,190</span>
              <Badge variant="info" className="text-label-xs-caps">Live in 12 Hubs</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-border-subtle transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary font-semibold">Draft Catalog</span>
              <span className="p-1 rounded-lg bg-surface-subtle text-text-secondary material-symbols-outlined text-[18px]">edit_note</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-metric-stat text-metric-stat text-text-primary tabular-nums">38</span>
              <Badge variant="secondary" className="text-label-xs-caps">Work in progress</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-rose-300 transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary font-semibold">Stock Depleted</span>
              <span className="p-1 rounded-lg bg-status-danger-bg text-status-danger material-symbols-outlined text-[18px]">inventory_2</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-metric-stat text-metric-stat text-status-danger tabular-nums">86</span>
              <Badge variant="destructive" className="text-label-xs-caps">Urgent Reorder</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-amber-300 transition-all">
          <CardContent className="p-space-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="font-label-xs-caps text-label-xs-caps uppercase tracking-wider text-text-secondary font-semibold">Pending Studio QC</span>
              <span className="p-1 rounded-lg bg-status-warning-bg text-status-warning material-symbols-outlined text-[18px]">photo_camera</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-metric-stat text-metric-stat text-status-warning tabular-nums">14</span>
              <Badge variant="warning" className="text-label-xs-caps">Asset Review</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Nav Chips & Quick View Filters */}
      <Card>
        <CardContent className="p-2 flex items-center justify-between flex-wrap gap-space-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {[
              { label: 'All', count: '4,820' },
              { label: "Women's Ethnic", count: '1,420' },
              { label: "Women's Western", count: '1,890' },
              { label: "Men's Casual", count: '940' },
              { label: 'Accessories & Footwear', count: '570' },
            ].map((cat) => {
              const isCatActive = activeCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(cat.label)}
                  className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all whitespace-nowrap ${
                    isCatActive
                      ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                      : 'bg-surface-subtle hover:bg-surface-container text-on-surface-variant'
                  }`}
                  type="button"
                >
                  {cat.label} ({cat.count})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pr-2">
            <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
              Parent Record: {styleCode}
            </span>
            <span className="inline-flex w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
          </div>
        </CardContent>
      </Card>

      {/* Editor Workspace Shell */}
      <Card className="overflow-hidden flex flex-col">
        {/* Studio Header / Top Utility Ribbon */}
        <div className="p-space-lg bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border-b border-border-subtle">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-16 rounded-lg overflow-hidden bg-surface-subtle shrink-0 shadow-xs border border-border-subtle">
              <img
                className="w-full h-full object-cover"
                alt="Product Editorial Thumbnail"
                src={product.thumbnail}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[10px] font-bold">
                  {product.seasonTag}
                </Badge>
                <Badge variant="success" className="text-[10px] font-semibold">
                  GST RECONCILED
                </Badge>
              </div>
              <h2 className="font-headline-md text-headline-md font-semibold text-text-primary tracking-tight mt-0.5">
                {title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 font-body-sm text-body-sm text-text-secondary mt-0.5">
                <span>Style Code: <strong className="text-text-primary font-mono text-label-sm">{styleCode}</strong></span>
                <span>•</span>
                <span>Atelier Jaipur Guild</span>
                <span>•</span>
                <span className="text-status-success font-medium">10 Variants Ready</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="flex flex-col text-right">
              <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
                Gross Profit Margin
              </span>
              <span className="font-metric-stat text-metric-stat text-status-success tabular-nums">
                {grossMarginPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Step Interactive Tabs Nav */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)}>
          <TabsList className="bg-surface-subtle px-space-md pt-2 border-b border-border-subtle">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                isActive={activeTab === tab.id}
                onSelect={() => setActiveTab(tab.id)}
                className="gap-2 font-label-md text-label-md"
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
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
            <Card className="bg-surface-canvas border-border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle/50">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">apparel</span>
                    <span>Garment Identification & Merchandising</span>
                  </h3>
                  <span className="font-label-xs-caps text-label-xs-caps text-text-secondary font-semibold">
                    MANDATORY COMPLIANCE
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
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
                    <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
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
                    <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
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
                    <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
                      Parent Style Code (SKU)
                    </label>
                    <Input
                      type="text"
                      value={styleCode}
                      onChange={(e) => setStyleCode(e.target.value)}
                      className="h-10 font-mono text-label-sm font-semibold bg-surface-container-lowest"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
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
                    <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
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
            <Card className="bg-surface-canvas border-border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <h3 className="font-headline-sm text-headline-sm font-semibold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">texture</span>
                  <span>Material, Fit & Manufacturing Composition</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                  <div className="space-y-1.5">
                    <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
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
                    <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
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
                    <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
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
                    <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
                      Recommended Wash Care
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={washCare}
                        onChange={(e) => setWashCare(e.target.value)}
                        className="h-10 bg-surface-container-lowest pr-9"
                      />
                      <span className="material-symbols-outlined text-[18px] text-secondary absolute right-3 top-2.5">
                        local_laundry_service
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-label-xs-caps text-label-xs-caps text-text-secondary uppercase font-semibold">
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

            {/* Studio Lookbook Media Assets (Strip of 5 slots) */}
            <Card className="bg-surface-canvas border-border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">perm_media</span>
                    <span>Studio 360° Photography & Swatch Assets</span>
                  </h3>
                  <label className="font-label-sm text-label-sm text-primary font-medium cursor-pointer hover:underline">
                    <span>+ Upload Hi-Res TIFF/JPG</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={() => onShowToast({ type: 'success', title: 'Asset Uploaded', message: 'High-resolution TIFF processed and generated WebP thumbnails.' })}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-5 gap-space-sm">
                  {product.mediaAssets.map((asset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveMediaSlot(asset)}
                      className="group relative rounded-lg overflow-hidden bg-surface-container aspect-[3/4] shadow-xs cursor-pointer hover:ring-2 hover:ring-primary transition-all border border-border-subtle"
                    >
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        alt={asset.slot}
                        src={asset.url}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex justify-between items-end">
                        <span className="text-[10px] font-semibold text-white uppercase">{asset.slot}</span>
                        {asset.isPrimary && (
                          <span className="material-symbols-outlined text-amber-300 text-[14px]">star</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Omnichannel Storefront & Publishing Toggles */}
            <Card className="bg-surface-canvas border-border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <h3 className="font-headline-sm text-headline-sm font-semibold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">storefront</span>
                  <span>Omnichannel Dispatch & Storefront Channels</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                  <div 
                    onClick={() => setSyncStorefront(!syncStorefront)}
                    className="p-space-md bg-surface-container-lowest rounded-xl flex items-start gap-3 shadow-xs border border-border-subtle cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Checkbox
                      checked={syncStorefront}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-label-sm text-label-sm font-semibold text-text-primary block">Myntra & Web Store</span>
                      <span className="font-label-xs-caps text-[11px] text-text-secondary">Sync live inventory on API</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => setCodActive(!codActive)}
                    className="p-space-md bg-surface-container-lowest rounded-xl flex items-start gap-3 shadow-xs border border-border-subtle cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Checkbox
                      checked={codActive}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-label-sm text-label-sm font-semibold text-text-primary block">COD Active</span>
                      <span className="font-label-xs-caps text-[11px] text-text-secondary">Enabled with ₹150 advance</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => setExpressShip(!expressShip)}
                    className="p-space-md bg-surface-container-lowest rounded-xl flex items-start gap-3 shadow-xs border border-border-subtle cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Checkbox
                      checked={expressShip}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-label-sm text-label-sm font-semibold text-text-primary block">Express 24-hr Ship</span>
                      <span className="font-label-xs-caps text-[11px] text-status-success font-medium">Eligible via {currentHub.id}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tab 6: Multi-Hub Stock Allocation Panel */}
            {activeTab === 6 && (
              <Card className="bg-surface-canvas border-border-subtle/50 animate-fade-in">
                <CardContent className="p-space-lg space-y-space-md">
                  <div className="flex items-center justify-between pb-2 border-b border-border-subtle/50">
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">warehouse</span>
                      <span>Multi-Hub Stock Allocation & Lead Times</span>
                    </h3>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onShowToast({ type: 'success', title: 'Stock Rebalanced', message: 'Requested transfer of 40 units from BLR-FC1 to BOM-FC2.' })}
                      className="h-7 text-xs font-semibold"
                    >
                      + Transfer Stock
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {[
                      { hub: 'BLR-Fulfillment-FC1', role: 'Primary South Hub', stock: '480 units', minSafety: '50 units', status: 'Healthy', color: 'text-status-success' },
                      { hub: 'BOM-Fulfillment-FC2', role: 'Bhiwandi / West Hub', stock: '185 units', minSafety: '40 units', status: 'Healthy', color: 'text-status-success' },
                      { hub: 'DEL-Fulfillment-FC1', role: 'Gurugram / North Hub', stock: '14 units', minSafety: '30 units', status: 'Low Stock Alert', color: 'text-status-warning' },
                      { hub: 'CCU-Fulfillment-FC4', role: 'Kolkata / East Hub', stock: '95 units', minSafety: '25 units', status: 'Healthy', color: 'text-status-success' },
                    ].map((h, i) => (
                      <div key={i} className="p-3 bg-surface-container-lowest rounded-lg border border-border-subtle flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-xs text-text-primary">{h.hub}</div>
                          <div className="text-[11px] text-text-secondary">{h.role} • Min threshold: {h.minSafety}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-xs text-text-primary tabular-nums">{h.stock}</div>
                          <span className={`text-[10px] font-semibold ${h.color}`}>{h.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab 7: Storefront & SEO Preview Panel */}
            {activeTab === 7 && (
              <Card className="bg-surface-canvas border-border-subtle/50 animate-fade-in">
                <CardContent className="p-space-lg space-y-space-md">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">language</span>
                    <span>Storefront Search Snippet & SEO Master</span>
                  </h3>
                  <div className="p-3 bg-surface-container-lowest rounded-lg border border-border-subtle space-y-1">
                    <span className="text-xs text-text-secondary font-mono">everwear.fashion &gt; atelier &gt; dresses &gt; mulberry-silk</span>
                    <div className="text-sm font-semibold text-primary hover:underline cursor-pointer">
                      {title} - Everwear Atelier Collection
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Shop the {title} handcrafted in Jaipur with 100% pure Mulberry silk. Available in Emerald Green and Wine Berry with express delivery.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">SEO Title Tag</label>
                      <Input
                        type="text"
                        defaultValue={`${title} | Luxury Silk Fashion - Everwear`}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Canonical URL Slug</label>
                      <Input
                        type="text"
                        defaultValue={`everwear-mulberry-silk-pleated-midi-dress-${styleCode.toLowerCase()}`}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Financials, GST Compliance & SKU Variant Matrix (5 Cols) */}
          <div className="xl:col-span-5 space-y-space-lg">
            {/* Pricing & Commercial Engine */}
            <Card className="bg-surface-canvas border-border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                    <span>Commercial Pricing & Margins</span>
                  </h3>
                  <Badge variant="success" className="font-bold">
                    {discountDepth}% OFF MRP
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-space-sm">
                  <div className="p-3 bg-surface-container-lowest rounded-lg shadow-xs border border-border-subtle">
                    <span className="font-label-xs-caps text-label-xs-caps text-text-secondary block font-semibold">MRP (INR)</span>
                    <div className="flex items-center mt-1">
                      <span className="text-sm font-bold text-text-primary">₹</span>
                      <input
                        type="number"
                        value={mrp}
                        onChange={(e) => setMrp(Number(e.target.value))}
                        className="w-full font-headline-sm text-headline-sm font-bold text-text-primary bg-transparent focus:outline-none tabular-nums"
                      />
                    </div>
                    <span className="text-[10px] text-text-secondary">Tag Display</span>
                  </div>

                  <div className="p-3 bg-surface-container-lowest rounded-lg shadow-xs border border-border-subtle">
                    <span className="font-label-xs-caps text-label-xs-caps text-text-secondary block font-semibold">B2C Selling Price</span>
                    <div className="flex items-center mt-1">
                      <span className="text-sm font-bold text-primary">₹</span>
                      <input
                        type="number"
                        value={b2cPrice}
                        onChange={(e) => setB2cPrice(Number(e.target.value))}
                        className="w-full font-headline-sm text-headline-sm font-bold text-primary bg-transparent focus:outline-none tabular-nums"
                      />
                    </div>
                    <span className="text-[10px] text-status-success font-medium">Effective cart</span>
                  </div>

                  <div className="p-3 bg-surface-container-lowest rounded-lg shadow-xs border border-border-subtle">
                    <span className="font-label-xs-caps text-label-xs-caps text-text-secondary block font-semibold">Procurement Cost</span>
                    <div className="flex items-center mt-1">
                      <span className="text-sm font-bold text-text-secondary">₹</span>
                      <input
                        type="number"
                        value={procurementCost}
                        onChange={(e) => setProcurementCost(Number(e.target.value))}
                        className="w-full font-headline-sm text-headline-sm font-bold text-text-secondary bg-transparent focus:outline-none tabular-nums"
                      />
                    </div>
                    <span className="text-[10px] text-text-secondary">CMT + Silk Fiber</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface-subtle flex items-center justify-between border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-status-success text-[18px]">trending_up</span>
                    <span className="font-label-sm text-label-sm text-text-primary font-medium">Net Gross Margin per Piece:</span>
                  </div>
                  <span className="font-label-md text-label-md font-bold text-status-success tabular-nums">
                    ₹{grossMargin.toLocaleString('en-IN')} ({grossMarginPercent}%)
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* GST & Indian Statutory Compliance Card */}
            <Card className="bg-surface-canvas border-border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">gavel</span>
                    <span>HSN Classification & GST Setup</span>
                  </h3>
                  <Badge variant="info">
                    Rule 138-CB
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-space-sm">
                  <div className="p-3 bg-surface-container-lowest rounded-lg shadow-xs border border-border-subtle">
                    <span className="font-label-xs-caps text-label-xs-caps text-text-secondary block font-semibold">Declared HSN Code</span>
                    <input
                      type="text"
                      value={hsnCode}
                      onChange={(e) => setHsnCode(e.target.value)}
                      className="w-full font-headline-sm text-headline-sm font-mono font-bold text-text-primary mt-1 bg-transparent focus:outline-none"
                    />
                    <span className="text-[11px] text-text-secondary leading-tight mt-0.5 block">{product.hsnDesc}</span>
                  </div>

                  <div className="p-3 bg-surface-container-lowest rounded-lg shadow-xs border border-border-subtle">
                    <span className="font-label-xs-caps text-label-xs-caps text-text-secondary block font-semibold">Applicable GST Slab</span>
                    <span className="font-headline-sm text-headline-sm font-bold text-text-primary mt-1 block">
                      {gstRate.toFixed(1)}% GST
                    </span>
                    <span className="text-[11px] text-text-secondary leading-tight mt-0.5 block">Threshold &gt; ₹1,000 tier</span>
                  </div>
                </div>

                {/* Tax Split Breakdown */}
                <div className="space-y-1.5 p-3 rounded-lg bg-surface-container-lowest border border-border-subtle">
                  <div className="flex justify-between font-body-sm text-body-sm text-text-secondary">
                    <span>Intra-state Supply (CGST {gstRate/2}% + SGST {gstRate/2}%)</span>
                    <span className="font-table-cell-num font-semibold text-text-primary tabular-nums">
                      ₹{cgstAmount} + ₹{sgstAmount}
                    </span>
                  </div>
                  <div className="flex justify-between font-body-sm text-body-sm text-text-secondary">
                    <span>Inter-state Dispatch (IGST {gstRate}%)</span>
                    <span className="font-table-cell-num font-semibold text-text-primary tabular-nums">
                      ₹{igstAmount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variant Matrix (Colorways & Sizes) */}
            <Card className="bg-surface-canvas border-border-subtle/50">
              <CardContent className="p-space-lg space-y-space-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">layers</span>
                      <span>Active SKU Variant Matrix</span>
                    </h3>
                    <p className="font-body-sm text-body-sm text-text-secondary">2 Colorways • 5 Standard Sizes</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShowToast({ type: 'info', title: 'New Colorway', message: 'Added Indigo Blue colorway template.' })}
                    className="h-8 text-xs"
                  >
                    + New Colorway
                  </Button>
                </div>

                {/* Colorway 1: Emerald Green */}
                <div className="bg-surface-container-lowest p-space-md rounded-xl space-y-space-sm shadow-xs border border-border-subtle">
                  <div className="flex items-center justify-between border-b border-surface-subtle pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#065F46] shadow-xs"></span>
                      <span className="font-label-md text-label-md font-bold text-text-primary">Emerald Green</span>
                      <span className="text-text-secondary text-label-xs-caps font-mono">#065F46</span>
                    </div>
                    <Badge variant="success" className="text-label-xs-caps font-semibold">
                      5 SKUs Active
                    </Badge>
                  </div>

                  {/* SKU Table Items */}
                  <div className="space-y-1.5 pt-1">
                    {product.colorways[0].skus.map((skuItem) => (
                      <div key={skuItem.size} className="flex items-center justify-between text-body-sm py-1 border-b border-surface-subtle/50">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-surface-subtle flex items-center justify-center font-bold text-[11px] text-text-primary">
                            {skuItem.size}
                          </span>
                          <span className="font-mono text-label-xs-caps text-text-secondary">
                            {skuItem.sku}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px] text-text-secondary">EAN: {skuItem.ean}</span>
                          <Badge 
                            variant={
                              skuItem.stock === 0 ? 'destructive' :
                              skuItem.stock < 20 ? 'warning' : 'success'
                            }
                            className="text-[10px] py-0 px-1.5 font-bold"
                          >
                            {skuItem.stock} {skuItem.stock === 0 ? 'Out' : skuItem.stock < 20 ? 'Low' : 'In Stock'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Colorway 2: Wine Berry */}
                <div className="bg-surface-container-lowest p-space-md rounded-xl space-y-space-sm shadow-xs border border-border-subtle">
                  <div className="flex items-center justify-between border-b border-surface-subtle pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#701A75] shadow-xs"></span>
                      <span className="font-label-md text-label-md font-bold text-text-primary">Wine Berry</span>
                      <span className="text-text-secondary text-label-xs-caps font-mono">#701A75</span>
                    </div>
                    <Badge variant="info" className="text-label-xs-caps font-semibold">
                      5 SKUs Generated
                    </Badge>
                  </div>
                  <div className="text-[12px] text-text-secondary flex items-center justify-between py-1">
                    <span>Standard Logistics Spec:</span>
                    <span className="font-mono text-text-primary">380g • 30×25×4 cm • Polybag Tier 1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Bottom Master Action Bar */}
        <div className="p-space-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md sticky bottom-0 z-30 shadow-lg border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-ping"></span>
            <span className="font-label-sm text-label-sm font-semibold text-text-primary">Studio Changes Auto-Saved</span>
            <span className="text-text-secondary font-label-xs-caps text-[11px]">(2 seconds ago)</span>
          </div>

          <div className="flex flex-wrap items-center gap-space-xs w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast({ type: 'warning', title: 'Draft Discarded', message: 'Restored original production style values.' })}
              className="text-status-danger hover:text-status-danger hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              Discard Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast({ type: 'info', title: 'Draft Saved', message: 'Saved as inactive draft in Everwear catalog repository.' })}
            >
              Save as Inactive Draft
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRunQc}
              className="gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Run Compliance QC Check</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePublish}
              className="gap-1.5 shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              <span>Publish Product (Active)</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Lookbook Zoom Dialog */}
      {activeMediaSlot && (
        <Dialog open={!!activeMediaSlot} onOpenChange={() => setActiveMediaSlot(null)}>
          <DialogContent className="max-w-2xl p-4 flex flex-col gap-3">
            <DialogHeader className="flex flex-row items-center justify-between pb-2">
              <DialogTitle className="text-sm font-semibold">
                {title} - {activeMediaSlot.slot} Perspective
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveMediaSlot(null)}
                className="h-7 w-7 text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </Button>
            </DialogHeader>
            <img 
              src={activeMediaSlot.url} 
              alt={activeMediaSlot.slot}
              className="max-h-[70vh] w-auto object-contain rounded-xl mx-auto"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
