import React, { useState, useMemo, useEffect } from 'react';
import {
  Icon,
  Button,
  Badge,
  Select,
  PageContainer,
  PageHeader,
  ContentGrid,
  StatsCard,
  StatusBadge,
  ErrorState,
  SkeletonPage,
  Thumbnail,
  SearchInput,
} from '../ui';
import { adminApi } from '../../lib/api';
import { EmptyState } from '../shared/FeedbackAndOverlays';
import { formatMoney } from '../../lib/format';
import {
  useCategoriesQuery,
  useCollectionsQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useCreateCollectionMutation
} from '../../hooks/useAdminQueries';

export function CategoriesAndCollections({ onNavigate, onShowToast }) {
  const [activeTab, setActiveTab] = useState('drops'); // 'drops', 'tree', 'rules'
  const [selectedDropId, setSelectedDropId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('All Seasons (2024-25)');
  const [statusFilter, setStatusFilter] = useState('Active & Scheduled');
  const [viewDensity, setViewDensity] = useState('list'); // 'list' | 'grid'
  const [selectedCheckboxes, setSelectedCheckboxes] = useState({ 'col-1': true });

  // TanStack Query for categories and collections
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategoriesQuery();
  const { data: collectionsDataRes, isLoading: isCollectionsLoading } = useCollectionsQuery();
  const createCategoryMutation = useCreateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const createCollectionMutation = useCreateCollectionMutation();

  const [dbCategories, setDbCategories] = useState([]);
  const [dbCollections, setDbCollections] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    handle: '',
    description: '',
  });

  const [collectionForm, setCollectionForm] = useState({
    title: '',
    handle: '',
  });

  useEffect(() => {
    if (categoriesData?.categories) {
      setDbCategories(categoriesData.categories);
    }
  }, [categoriesData]);

  useEffect(() => {
    if (collectionsDataRes?.collections) {
      setDbCollections(collectionsDataRes.collections);
    }
  }, [collectionsDataRes]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name || !categoryForm.handle) return;
    setIsSubmitting(true);
    try {
      await createCategoryMutation.mutateAsync({
        name: categoryForm.name,
        handle: categoryForm.handle.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: categoryForm.description || undefined,
      });
      onShowToast?.({
        type: 'success',
        title: 'Category Created',
        message: `Apparel category "${categoryForm.name}" created in database.`,
      });
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', handle: '', description: '' });
    } catch (err) {
      onShowToast?.({
        type: 'error',
        title: 'Creation Failed',
        message: err?.message || 'Failed to create category.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!confirm(`Delete category "${catName}"?`)) return;
    try {
      await deleteCategoryMutation.mutateAsync(catId);
      onShowToast?.({
        type: 'info',
        title: 'Category Removed',
        message: `Category "${catName}" removed.`,
      });
    } catch (err) {
      onShowToast?.({
        type: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Could not delete category.',
      });
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!collectionForm.title || !collectionForm.handle) return;
    setIsSubmitting(true);
    try {
      await createCollectionMutation.mutateAsync({
        title: collectionForm.title,
        handle: collectionForm.handle.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      });
      onShowToast?.({
        type: 'success',
        title: 'Collection Drop Created',
        message: `Curated collection "${collectionForm.title}" added to catalog.`,
      });
      setIsCollectionModalOpen(false);
      setCollectionForm({ title: '', handle: '' });
    } catch (err) {
      onShowToast?.({
        type: 'error',
        title: 'Creation Failed',
        message: err?.message || 'Failed to create collection.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Merge live collections with mock collections
  const mergedCollections = useMemo(() => {
    // A collection carries a handle, a title and how many products are in it.
    // Sell-through, GMV, season, launch date and channel list were fixed
    // strings on every row; none of them exist in the data.
    const fromDb = dbCollections.map((col, idx) => {
      const products = col.productCount ?? 0;
      const range = col.priceRange;
      return {
        id: col.id,
        handle: col.handle,
        code: `DROP-${col.handle.toUpperCase()}`,
        title: col.title,
        thumbnail: col.thumbnail ?? null,
        productCount: products,
        variantCount: col.variantCount ?? 0,
        publishedCount: col.publishedCount ?? 0,
        stock: col.stock ?? 0,
        productLabel: `${products} ${products === 1 ? 'product' : 'products'}`,
        variantLabel: `${col.variantCount ?? 0} ${col.variantCount === 1 ? 'SKU' : 'SKUs'}`,
        priceRange: range
          ? range.min === range.max
            ? formatMoney(range.min, 'inr')
            : `${formatMoney(range.min, 'inr')} - ${formatMoney(range.max, 'inr')}`
          : null,
        updatedLabel: col.updatedAt
          ? new Date(col.updatedAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : null,
        status: products > 0 ? 'In use' : 'Empty',
        statusColor:
          products > 0 ? 'bg-status-success-bg text-success' : 'bg-surface-subtle text-muted',
        isHero: idx === 0,
      };
    });

    return fromDb;
  }, [dbCollections]);



  /** The ribbon and the tab badges, counted off the taxonomy and the drops. */
  const catalogShape = useMemo(() => {
    const cats = dbCategories ?? [];
    return {
      categories: cats.length,
      rootCategories: cats.filter((c) => !c.parentId).length,
      collections: mergedCollections.length,
      emptyCollections: mergedCollections.filter((c) => c.productCount === 0).length,
      grouped: mergedCollections.reduce((n, c) => n + c.productCount, 0),
      variants: mergedCollections.reduce((n, c) => n + c.variantCount, 0),
      stock: mergedCollections.reduce((n, c) => n + c.stock, 0),
    };
  }, [dbCategories, mergedCollections]);

  const selectedDrop = useMemo(() => {
    return mergedCollections.find(d => d.id === selectedDropId) || mergedCollections[0];
  }, [mergedCollections, selectedDropId]);

  const filteredCollections = useMemo(() => {
    return mergedCollections.filter(d => {
      if (seasonFilter !== 'All Seasons (2024-25)' && d.season !== seasonFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!d.title.toLowerCase().includes(q) && !d.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [mergedCollections, searchQuery, seasonFilter]);

  const toggleCheckbox = (id) => {
    setSelectedCheckboxes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectedCount = Object.values(selectedCheckboxes).filter(Boolean).length;

  if (isCategoriesLoading || isCollectionsLoading) {
    return <SkeletonPage variant="cards" stats={6} statsCols={6} label="Loading catalog structure" />;
  }

  return (
    <PageContainer>
      {categoriesError && (
        <ErrorState
          title="Categories could not be loaded"
          message={categoriesError?.message}
          onRetry={() => refetchCategories()}
        />
      )}
      <PageHeader
        breadcrumb="Everwear Admin / Catalog & Inventory / Categories & Collections"
        title="Taxonomy, Collections & Visual Merchandising"
        description="Manage seasonal drops, hierarchical apparel taxonomy, curated lookbook collections, and dynamic rule-based sorting across storefronts and marketplace feeds."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-space-xs pt-2 lg:shrink-0 xl:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoryModalOpen(true)}
              icon="add"
            >
              New Category
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCollectionModalOpen(true)}
              icon="stars"
            >
              Create Collection Drop
            </Button>
          </div>
        }
      />

      {/* KPI / Metric Ribbon */}
      <ContentGrid columns={4}>
        <StatsCard
          label="Categories"
          value={String(catalogShape.categories)}
          changeType="neutral"
          icon="account_tree"
          subtitle={`${catalogShape.rootCategories} top level`}
        />
        <StatsCard
          label="Collection drops"
          value={`${catalogShape.collections} ${catalogShape.collections === 1 ? 'drop' : 'drops'}`}
          changeType="neutral"
          icon="auto_awesome"
          subtitle={`${catalogShape.emptyCollections} with no product`}
        />
        <StatsCard
          label="Products in a drop"
          value={String(catalogShape.grouped)}
          changeType="neutral"
          icon="tune"
          subtitle={`${catalogShape.variants} variants across them`}
        />
        <StatsCard
          label="Units in stock"
          value={catalogShape.stock.toLocaleString('en-IN')}
          changeType="neutral"
          icon="verified"
          subtitle="Tracked variants in collections"
        />
      </ContentGrid>

      {/* Main Work Surface (2/3 Master + 1/3 Inspector Split) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
        {/* LEFT 8-COLUMNS: Management Matrix & Collection Engine */}
        <div className="xl:col-span-8 flex flex-col space-y-space-sm">
          {/* Primary Tab Navigation Strip */}
          <div className="bg-surface-container-lowest rounded-xl p-space-xs shadow-sm border border-subtle flex items-center justify-between flex-wrap gap-space-xs">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('drops')}
                className={`px-space-md py-1.5 rounded-lg text-label flex items-center gap-2 transition-all ${
 activeTab === 'drops'
 ? 'bg-primary-container text-on-accent shadow-sm font-semibold'
 : 'hover:bg-surface-subtle text-muted'
 }`}
                type="button"
              >
                <span>Curated Drops & Collections</span>
                <span className={`px-1.5 py-px rounded-full text-micro ${activeTab === 'drops' ? 'bg-scrim/25 text-on-accent' : 'bg-surface-subtle text-muted'}`}>
                  {mergedCollections.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('tree')}
                className={`px-space-md py-1.5 rounded-lg text-label flex items-center gap-2 transition-all ${
 activeTab === 'tree'
 ? 'bg-primary-container text-on-accent shadow-sm font-semibold'
 : 'hover:bg-surface-subtle text-muted'
 }`}
                type="button"
              >
                <span>Taxonomy Hierarchy Tree</span>
                <span className={`px-1.5 py-px rounded-full text-micro ${activeTab === 'tree' ? 'bg-scrim/25 text-on-accent' : 'bg-surface-subtle text-muted'}`}>
                  {catalogShape.categories}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-space-md py-1.5 rounded-lg text-label flex items-center gap-2 transition-all ${
 activeTab === 'rules'
 ? 'bg-primary-container text-on-accent shadow-sm font-semibold'
 : 'hover:bg-surface-subtle text-muted'
 }`}
                type="button"
              >
                <span>Smart Rules Engine</span>
                <span className={`px-1.5 py-px rounded-full text-micro ${activeTab === 'rules' ? 'bg-scrim/25 text-on-accent' : 'bg-surface-subtle text-muted'}`}>
                  {catalogShape.grouped}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-1 pr-1">
              <button
                onClick={() => setViewDensity('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewDensity === 'list' ? 'bg-surface-subtle text-primary' : 'text-muted hover:bg-surface-subtle'}`}
                title="Density Matrix"
                type="button"
              >
                <Icon name="view_list" className="material-symbols-outlined text-icon-md" />
              </button>
              <button
                onClick={() => setViewDensity('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewDensity === 'grid' ? 'bg-surface-subtle text-primary' : 'text-muted hover:bg-surface-subtle'}`}
                title="Visual Cards View"
                type="button"
              >
                <Icon name="grid_view" className="material-symbols-outlined text-icon-md" />
              </button>
            </div>
          </div>

          {/* High Density Filter Bar */}
          <div className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm border border-subtle flex flex-col md:flex-row md:items-center justify-between gap-space-xs">
            <div className="flex items-center gap-space-xs flex-1 max-w-lg">
              <SearchInput
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search title, slug, tag or hero model"
                label="Search collections"
                className="w-full flex-1"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Season select */}
              <div className="w-48">
                <Select
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value)}
                  className="h-8 text-meta"
                >
                  <option>All Seasons (2024-25)</option>
                  <option>Festive Atelier '24</option>
                  <option>Autumn/Winter '24</option>
                  <option>Summer Essentials '24</option>
                  <option>Core Evergreen</option>
                </Select>
              </div>
              {/* Status Pill Filter */}
              <div className="w-44">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 text-meta"
                >
                  <option>Active &amp; Scheduled</option>
                  <option>Active Live Only</option>
                  <option>Draft / In Review</option>
                  <option>Archived</option>
                </Select>
              </div>
            </div>
          </div>

          {/* TAB 1: Curated Drops & Collections */}
          {activeTab === 'drops' && (
            <div className="space-y-space-xs">
              {filteredCollections.map((col) => {
                const isSelected = selectedDropId === col.id;
                return (
                  <div
                    key={col.id}
                    onClick={() => setSelectedDropId(col.id)}
                    className={`group relative p-space-sm rounded-xl shadow-sm transition-all cursor-pointer border ${
 isSelected
 ? 'bg-primary-fixed/40 border-primary shadow-sm'
 : 'bg-surface-container-lowest hover:bg-surface-bright border-subtle'
 }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
                      <div className="flex items-center gap-space-sm min-w-0">
                        <input
                          checked={!!selectedCheckboxes[col.id]}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleCheckbox(col.id);
                          }}
                          className="w-4 h-4 rounded text-accent accent-primary-container shrink-0 cursor-pointer"
                          type="checkbox"
                        />
                        {/* Lookbook Image */}
                        <div className="relative w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-surface-subtle shadow-inner">
                          <Thumbnail src={col.thumbnail} alt={col.title} className="w-full h-full" imgClassName="object-cover" />
                        </div>
                        {/* Metadata & Title */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-subheading text-primary font-semibold truncate hover:text-accent">
                              {col.title}
                            </span>
                            <span
                              className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-full text-caption font-semibold ${col.statusColor}`}
                            >
                              {col.status}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-surface-subtle text-caption text-muted">
                              {col.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-space-sm mt-1 text-body text-secondary flex-wrap">
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <Icon name="checkroom" className="material-symbols-outlined text-icon-sm text-accent" />
                              {col.productLabel}
                            </span>
                            <span>•</span>
                            <span>{col.variantLabel}</span>
                            {col.priceRange && (
                              <>
                                <span>•</span>
                                <span>
                                  Price range:{' '}
                                  <strong className="whitespace-nowrap text-primary font-semibold">
                                    {col.priceRange}
                                  </strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantitative Metrics Block */}
                      {/* Collection GMV and a CVR / AOV pair sat here. Neither is
                          attributed to a collection anywhere, so the two blocks
                          rendered their labels above empty values. These are
                          facts the collection does carry. */}
                      <div className="flex items-center gap-space-lg shrink-0 justify-between lg:justify-end pl-6 lg:pl-0">
                        <div className="flex flex-col text-right">
                          <span className="text-caption text-muted">UNITS IN STOCK</span>
                          <span className="text-subheading text-primary font-semibold tabular-nums">
                            {col.stock.toLocaleString('en-IN')}
                          </span>
                          <span className="text-micro text-muted">across {col.variantLabel}</span>
                        </div>
                        <div className="hidden sm:flex flex-col text-right">
                          <span className="text-caption text-muted">PUBLISHED</span>
                          <span className="text-body text-primary font-medium tabular-nums">
                            {col.publishedCount} of {col.productCount}
                          </span>
                          <span className="whitespace-nowrap text-micro text-muted">
                            {col.updatedLabel ? `Updated ${col.updatedLabel}` : 'Never updated'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Quick Batch Merchandising Bar */}
              <div className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm border border-subtle flex items-center justify-between text-body">
                <div className="flex items-center gap-space-sm text-muted">
                  <span className="text-label font-semibold text-primary">
                    {selectedCount} Collection Selected
                  </span>
                  <span>•</span>
                  <span>Showing {filteredCollections.length} of {mergedCollections.length} drops</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Taxonomy Hierarchy Tree */}
          {activeTab === 'tree' && (
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-subtle shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-primary">Everwear Apparel Master Hierarchy</h3>
                  <p className="text-meta text-muted">{dbCategories.length} Active Master Categories · Synchronized with MongoDB</p>
                </div>
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-3 py-1.5 bg-primary-container hover:bg-primary-container-hover text-on-accent text-meta font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  + Add Root Node
                </button>
              </div>

              <div className="space-y-3 text-meta">
                {/* Live MongoDB Categories */}
                {dbCategories.length > 0 && (
                  <div className="p-3 bg-surface-canvas rounded-lg border border-primary-container/20 space-y-2">
                    <div className="flex items-center justify-between font-semibold text-primary">
                      <div className="flex items-center gap-2">
                        <Icon name="database" className="material-symbols-outlined text-icon text-accent" />
                        <span>Active Database Categories ({dbCategories.length})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-micro font-semibold">Live in API</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {dbCategories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between py-1.5 px-2 bg-surface-container-lowest rounded border border-subtle">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-accent font-semibold whitespace-nowrap">/{cat.handle}</span>
                            <span className="text-primary font-medium">{cat.name}</span>
                            {cat.description && <span className="text-muted text-micro">({cat.description})</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-muted whitespace-nowrap">{cat.productCount ?? 0} Products</span>
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="text-muted hover:text-danger p-0.5 rounded"
                              title="Delete Category"
                            >
                              <Icon name="delete" className="material-symbols-outlined text-icon-sm" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Women's Ethnic */}
                <div className="p-3 bg-surface-canvas rounded-lg border border-subtle">
                  <div className="flex items-center justify-between font-semibold text-primary cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon name="folder" className="material-symbols-outlined text-icon text-accent" />
                      <span>Women's Ethnic Atelier (48 Sub-categories)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro">1,280 SKUs Active</span>
                  </div>
                  <div className="pl-6 mt-2 space-y-1.5 text-muted">
                    <div className="flex items-center justify-between py-1 border-b border-subtle">
                      <span>└── Sarees (Chanderi, Banarasi, Raw Silk, Georgette)</span>
                      <span className="font-mono text-primary whitespace-nowrap">420 SKUs</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-subtle">
                      <span>└── Kurtas & Sets (Anarkali, Straight Fit, Palazzo Combos)</span>
                      <span className="font-mono text-primary whitespace-nowrap">540 SKUs</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>└── Lehengas & Dupattas (Bridal Velvet, Zari Heavy, Festive Organza)</span>
                      <span className="font-mono text-primary whitespace-nowrap">320 SKUs</span>
                    </div>
                  </div>
                </div>

                {/* Men's Sartorial & Casual */}
                <div className="p-3 bg-surface-canvas rounded-lg border border-subtle">
                  <div className="flex items-center justify-between font-semibold text-primary cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon name="folder" className="material-symbols-outlined text-icon text-accent" />
                      <span>Men's Sartorial & Casuals (36 Sub-categories)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-status-info-bg text-info text-micro">940 SKUs Active</span>
                  </div>
                  <div className="pl-6 mt-2 space-y-1.5 text-muted">
                    <div className="flex items-center justify-between py-1 border-b border-subtle">
                      <span>└── Shirts & Knits (Supima Cotton, French Linen, Oxford Weave)</span>
                      <span className="font-mono text-primary whitespace-nowrap">380 SKUs</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-subtle">
                      <span>└── Outerwear & Tailored (Cashmere Overcoats, Merino Wool, Sherwanis)</span>
                      <span className="font-mono text-primary whitespace-nowrap">240 SKUs</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>└── Denim & Trousers (Shuttle-Loom Selvedge, Pleated Chinos)</span>
                      <span className="font-mono text-primary whitespace-nowrap">320 SKUs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Smart Rules Engine */}
          {activeTab === 'rules' && (
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-subtle shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-primary">Dynamic Merchandising & Re-ranking Rules</h3>
                  <p className="text-meta text-muted">24 Active visual rules regulating product placements across storefronts</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-surface-canvas rounded-xl border border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-meta text-primary">RULE #01: High Gross Margin Booster</span>
                    <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-success text-micro font-semibold">Active in 18 Collections</span>
                  </div>
                  <p className="text-meta text-muted">IF Gross Margin &gt;= 55% AND Local FC Stock &gt; 10 THEN Elevate Rank by +35 positions.</p>
                  <div className="flex items-center gap-4 text-micro text-muted font-mono whitespace-nowrap">
                    <span>Lift: +4.8% Net Contribution</span>
                    <span>Evaluation Latency: 12ms</span>
                  </div>
                </div>

                <div className="p-4 bg-surface-canvas rounded-xl border border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-meta text-primary">RULE #02: Low Inventory Demotion Guardrail</span>
                    <span className="px-2 py-0.5 rounded-full bg-status-warning-bg text-warning text-micro font-semibold">Storewide Guard</span>
                  </div>
                  <p className="text-meta text-muted">IF Total Size Availability &lt; 2 Sizes THEN Demote to Page 2+ to prevent bounce rate spike.</p>
                  <div className="flex items-center gap-4 text-micro text-muted font-mono whitespace-nowrap">
                    <span>Prevents 8.4% Out-of-Stock Clicks</span>
                    <span>Active 24/7</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT 4-COLUMNS: Visual Merchandising Inspector Drawer (Exact 1:1 with Stitch design) */}
        {!selectedDrop ? (
          <div className="xl:col-span-4">
            <EmptyState icon="collections_bookmark" title="No collection selected" message="Pick a collection from the list to inspect it." />
          </div>
        ) : (
        <div className="xl:col-span-4 flex flex-col space-y-space-sm">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle p-space-md flex flex-col space-y-space-md">
            {/* Inspector Top Header */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-caption text-accent uppercase font-semibold">
                  <Icon name="tune" className="material-symbols-outlined text-icon-sm" />
                  Visual Merch Inspector
                </div>
                <h2 className="text-heading text-primary font-semibold tracking-tight mt-0.5">
                  {selectedDrop.title}
                </h2>
                <span className="text-body text-secondary">Collection ID: {selectedDrop.code}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-full bg-status-success-bg text-success text-caption font-semibold">
                  LIVE APP
                </span>
              </div>
            </div>

            {/* The hero image, the sorting weights and the placement targets
                were `heroBanner`, `marginWeight`, `velocityWeight` and three
                fixed channel rows. A collection stores none of them, so the
                panel rendered an empty frame, three labels reading "%" and a
                slider at zero. These are what it does hold. */}
            <div className="space-y-space-xs">
              <div className="flex items-center justify-between text-caption text-muted">
                <span>COLLECTION IMAGE</span>
                <span>From the first product in the drop</span>
              </div>
              {selectedDrop.thumbnail ? (
                <div className="relative overflow-hidden rounded-lg border border-subtle bg-surface-canvas shadow-inner">
                  <img
                    src={selectedDrop.thumbnail}
                    alt={selectedDrop.title}
                    className="h-32 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-subtle bg-surface-canvas text-meta text-muted">
                  No product in this drop carries an image
                </div>
              )}
            </div>

            <div className="space-y-space-xs pt-1">
              <span className="text-caption text-muted uppercase">Composition</span>
              <dl className="flex flex-col gap-space-sm rounded-lg border border-subtle bg-surface-canvas p-space-sm">
                {[
                  ['Products', `${selectedDrop.productCount}`],
                  ['Variants', `${selectedDrop.variantCount}`],
                  ['Published', `${selectedDrop.publishedCount} of ${selectedDrop.productCount}`],
                  ['Units in stock', selectedDrop.stock.toLocaleString('en-IN')],
                  ['Price range', selectedDrop.priceRange ?? 'No priced variant'],
                  ['Last updated', selectedDrop.updatedLabel ?? 'Never'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-space-md">
                    <dt className="text-meta text-muted">{label}</dt>
                    <dd className="whitespace-nowrap text-body text-primary">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Bottom Action Commit Button */}
          </div>

        </div>
        )}
      </div>

      {/* New Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-scrim/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-subtle max-w-md w-full overflow-hidden animate-fade-in fade-in duration-150">
            <div className="p-space-lg border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="folder" className="p-2 rounded-xl bg-primary-container text-on-accent material-symbols-outlined text-icon-lg" />
                <div>
                  <h3 className="font-semibold text-primary">New Apparel Category</h3>
                  <p className="text-meta text-muted">Create a taxonomy node in the catalog hierarchy</p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-muted" title="Close" aria-label="Close"
              >
                <Icon name="close" className="material-symbols-outlined text-icon-md" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-space-lg space-y-4">
              <div>
                <label className="block text-meta font-semibold text-muted mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silk Dupattas"
                  value={categoryForm.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryForm({
                      ...categoryForm,
                      name: val,
                      handle: categoryForm.handle ? categoryForm.handle : val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    });
                  }}
                  className="w-full h-9 px-3 bg-surface-canvas border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div>
                <label className="block text-meta font-semibold text-muted mb-1">URL Handle (slug) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. silk-dupattas"
                  value={categoryForm.handle}
                  onChange={(e) => setCategoryForm({ ...categoryForm, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-subtle rounded-lg text-meta font-mono text-primary focus:outline-none focus:ring-1 focus:ring-primary-container whitespace-nowrap"
                />
              </div>

              <div>
                <label className="block text-meta font-semibold text-muted mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Curated artisanal silk drapes crafted with authentic gold zari..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full p-3 bg-surface-canvas border border-subtle rounded-lg text-meta text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-subtle bg-surface-container-lowest text-primary text-meta font-semibold hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-primary-container hover:bg-primary-container-hover text-on-accent text-meta font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Icon name={isSubmitting ? 'hourglass_top' : 'check'} className="material-symbols-outlined text-icon" />
                  <span>{isSubmitting ? 'Creating...' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Collection Drop Modal */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-scrim/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-subtle max-w-md w-full overflow-hidden animate-fade-in fade-in duration-150">
            <div className="p-space-lg border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="stars" className="p-2 rounded-xl bg-fashion-magenta text-on-accent material-symbols-outlined text-icon-lg" />
                <div>
                  <h3 className="font-semibold text-primary">Create Collection Drop</h3>
                  <p className="text-meta text-muted">Launch a seasonal drop or curated capsule lookbook</p>
                </div>
              </div>
              <button
                onClick={() => setIsCollectionModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-subtle flex items-center justify-center text-muted" title="Close" aria-label="Close"
              >
                <Icon name="close" className="material-symbols-outlined text-icon-md" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="p-space-lg space-y-4">
              <div>
                <label className="block text-meta font-semibold text-muted mb-1">Collection Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Benares Festive '25"
                  value={collectionForm.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCollectionForm({
                      ...collectionForm,
                      title: val,
                      handle: collectionForm.handle ? collectionForm.handle : val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    });
                  }}
                  className="w-full h-9 px-3 bg-surface-canvas border border-subtle rounded-lg text-meta font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div>
                <label className="block text-meta font-semibold text-muted mb-1">URL Handle (slug) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. royal-benares-festive-25"
                  value={collectionForm.handle}
                  onChange={(e) => setCollectionForm({ ...collectionForm, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full h-9 px-3 bg-surface-canvas border border-subtle rounded-lg text-meta font-mono text-primary focus:outline-none focus:ring-1 focus:ring-primary-container whitespace-nowrap"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setIsCollectionModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-subtle bg-surface-container-lowest text-primary text-meta font-semibold hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-fashion-magenta hover:bg-fashion-magenta/90 text-on-accent text-meta font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Icon name={isSubmitting ? 'hourglass_top' : 'check'} className="material-symbols-outlined text-icon" />
                  <span>{isSubmitting ? 'Creating...' : 'Launch Drop'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
