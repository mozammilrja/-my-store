import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const TABS = ['drops', 'tree'];

export function CategoriesAndCollections({ onNavigate, onShowToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'drops';
  // Pushed, not replaced: switching tabs is navigation, so Back returns to the
  // tab you came from.
  const setActiveTab = (next) =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'drops') params.delete('tab');
      else params.set('tab', next);
      return params;
    });

  const [selectedDropId, setSelectedDropId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Both tabs filter on whether the row actually holds products, which is the
  // only status either a collection or a category carries.
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewDensity, setViewDensity] = useState('list'); // 'list' | 'grid'
  const [selectedCheckboxes, setSelectedCheckboxes] = useState({});

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

  const filteredCollections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mergedCollections.filter((d) => {
      if (statusFilter === 'in-use' && d.productCount === 0) return false;
      if (statusFilter === 'empty' && d.productCount > 0) return false;
      if (q && !d.title.toLowerCase().includes(q) && !d.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [mergedCollections, searchQuery, statusFilter]);

  /** The taxonomy list obeys the same search box and status select. */
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (dbCategories ?? []).filter((c) => {
      const products = c.productCount ?? 0;
      if (statusFilter === 'in-use' && products === 0) return false;
      if (statusFilter === 'empty' && products > 0) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.handle.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dbCategories, searchQuery, statusFilter]);

  // Resolved against the filtered list, so the inspector never describes a
  // collection the filters have hidden.
  const selectedDrop = useMemo(() => {
    return filteredCollections.find((d) => d.id === selectedDropId) || filteredCollections[0] || null;
  }, [filteredCollections, selectedDropId]);

  const isTree = activeTab === 'tree';

  const selectedCategory = useMemo(() => {
    return filteredCategories.find((c) => c.id === selectedCategoryId) || filteredCategories[0] || null;
  }, [filteredCategories, selectedCategoryId]);

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
                  {filteredCollections.length}
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
                  {filteredCategories.length}
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
                placeholder={isTree ? 'Search category name or slug' : 'Search collection title or code'}
                label={isTree ? 'Search categories' : 'Search collections'}
                className="w-full flex-1"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* A collection and a category each carry one real status:
                  whether any product sits in it. The season and lifecycle
                  selects that stood here filtered on fields that neither a
                  collection nor a category holds. */}
              <div className="w-48">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 text-meta"
                  aria-label={isTree ? 'Filter categories' : 'Filter collections'}
                >
                  <option value="all">{isTree ? 'All categories' : 'All collections'}</option>
                  <option value="in-use">With products</option>
                  <option value="empty">Empty</option>
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
          {/* TAB 2: Taxonomy Hierarchy Tree. The two hand-written trees that
              stood below the live list ("Women's Ethnic Atelier, 48
              sub-categories, 1,280 SKUs" and a men's equivalent) described a
              taxonomy that does not exist: categories are flat in the database
              and carry their own product counts. */}
          {activeTab === 'tree' && (
            <div className="bg-surface-container-lowest p-space-md rounded-xl border border-subtle shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center justify-between gap-space-md">
                <div>
                  <h3 className="font-semibold text-primary">Apparel taxonomy</h3>
                  <p className="text-meta text-muted">
                    {filteredCategories.length === dbCategories.length
                      ? `${dbCategories.length} ${dbCategories.length === 1 ? 'category' : 'categories'} in the catalog`
                      : `Showing ${filteredCategories.length} of ${dbCategories.length} categories`}
                  </p>
                </div>
                <Button variant="outline" size="sm" icon="add" onClick={() => setIsCategoryModalOpen(true)}>
                  Add category
                </Button>
              </div>

              {filteredCategories.length === 0 ? (
                <EmptyState
                  icon="account_tree"
                  title={dbCategories.length === 0 ? 'No categories yet' : 'No category matches these filters'}
                  description={
                    dbCategories.length === 0
                      ? 'Create a category to start building the catalog taxonomy.'
                      : 'Clear the search or the status filter to see the rest of the taxonomy.'
                  }
                />
              ) : (
                <div className="flex flex-col gap-space-xs">
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategory?.id === cat.id;
                    const products = cat.productCount ?? 0;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`flex cursor-pointer items-center justify-between gap-space-md rounded-lg border p-space-sm transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary-fixed/40'
                            : 'border-subtle bg-surface-canvas hover:bg-surface-bright'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-space-sm">
                          <Icon name="folder" className="material-symbols-outlined text-icon text-accent" />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-body font-medium text-primary">{cat.name}</span>
                            <span className="truncate font-mono text-micro text-muted">/{cat.handle}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-space-sm">
                          <span className="whitespace-nowrap font-mono text-meta text-secondary">
                            {products} {products === 1 ? 'product' : 'products'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat.id, cat.name);
                            }}
                            className="rounded p-0.5 text-muted hover:text-danger"
                            title={`Delete ${cat.name}`}
                            aria-label={`Delete ${cat.name}`}
                          >
                            <Icon name="delete" className="material-symbols-outlined text-icon-sm" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


        </div>

        {/* RIGHT 4-COLUMNS: the inspector describes whatever the active tab
            lists. It used to render the collection inspector on every tab, so
            selecting Taxonomy left a collection's details on screen beside a
            list of categories. */}
        {isTree ? (
          !selectedCategory ? (
            <div className="xl:col-span-4">
              <EmptyState
                icon="account_tree"
                title="No category selected"
                description="Pick a category from the taxonomy to inspect it."
              />
            </div>
          ) : (
            <div className="xl:col-span-4 flex flex-col space-y-space-sm">
              <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle p-space-md flex flex-col space-y-space-md">
                <div className="flex items-start justify-between gap-space-sm">
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-1.5 text-caption text-accent uppercase font-semibold">
                      <Icon name="account_tree" className="material-symbols-outlined text-icon-sm" />
                      Category Inspector
                    </div>
                    <h2 className="text-heading text-primary font-semibold tracking-tight mt-0.5 truncate">
                      {selectedCategory.name}
                    </h2>
                    <span className="font-mono text-body text-secondary">/{selectedCategory.handle}</span>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold ${
                      (selectedCategory.productCount ?? 0) > 0
                        ? 'bg-status-success-bg text-success'
                        : 'bg-surface-subtle text-muted'
                    }`}
                  >
                    {(selectedCategory.productCount ?? 0) > 0 ? 'IN USE' : 'EMPTY'}
                  </span>
                </div>

                {selectedCategory.description && (
                  <p className="text-meta text-secondary">{selectedCategory.description}</p>
                )}

                <div className="space-y-space-xs pt-1">
                  <span className="text-caption text-muted uppercase">Details</span>
                  <dl className="flex flex-col gap-space-sm rounded-lg border border-subtle bg-surface-canvas p-space-sm">
                    {[
                      ['Products', `${selectedCategory.productCount ?? 0}`],
                      [
                        'Parent',
                        selectedCategory.parentId
                          ? dbCategories.find((c) => c.id === selectedCategory.parentId)?.name ??
                            selectedCategory.parentId
                          : 'Top level',
                      ],
                      [
                        'Last updated',
                        selectedCategory.updatedAt
                          ? new Date(selectedCategory.updatedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Never',
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-space-md">
                        <dt className="text-meta text-muted">{label}</dt>
                        <dd className="truncate text-body text-primary">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="flex items-center gap-space-xs border-t border-subtle pt-space-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    icon="inventory_2"
                    onClick={() => onNavigate?.('product-catalog')}
                  >
                    View products
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon="delete"
                    onClick={() => handleDeleteCategory(selectedCategory.id, selectedCategory.name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )
        ) : !selectedDrop ? (
          <div className="xl:col-span-4">
            <EmptyState
              icon="collections_bookmark"
              title={mergedCollections.length === 0 ? 'No collections yet' : 'No collection selected'}
              description={
                mergedCollections.length === 0
                  ? 'Create a collection drop to start grouping products.'
                  : 'Pick a collection from the list to inspect it.'
              }
            />
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
