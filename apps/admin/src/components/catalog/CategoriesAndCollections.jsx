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
  PageBody,
  SkeletonPage,
  Thumbnail,
  SearchInput,
  Card,
  SectionCard,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  FilterBar,
  AppDialog,
  ConfirmDialog,
  FormInput,
  FormTextarea,
} from '../ui';
import { cn } from '../../lib/utils';
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

  // Deletion asks through a confirm dialog rather than window.confirm.
  const [pendingCategoryDelete, setPendingCategoryDelete] = useState(null); // { id, name }

  const handleDeleteCategory = (catId, catName) => setPendingCategoryDelete({ id: catId, name: catName });

  const confirmDeleteCategory = async () => {
    if (!pendingCategoryDelete) return;
    const { id: catId, name: catName } = pendingCategoryDelete;
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
    } finally {
      setPendingCategoryDelete(null);
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
        statusVariant: products > 0 ? 'success' : 'secondary',
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
  // No collection exists at all: the list, its filters and the inspector have
  // nothing to work on, so the tab becomes one call to create the first drop.
  const noCollections = !isTree && mergedCollections.length === 0;

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
      <PageHeader
        kicker="Catalog & inventory"
        title="Categories & collections"
        description="How products are grouped in the storefront."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-space-sm lg:shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(true)}>
              <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>New category</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsCollectionModalOpen(true)}>
              <Icon name="stars" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
              <span>Create collection drop</span>
            </Button>
          </div>
        }
      />
      <PageBody
        error={categoriesError}
        hasData={categoriesData != null}
        title="Categories could not be loaded"
        onRetry={refetchCategories}
      >

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

        {/* View switch (synced to ?tab=) and the list density toggle. */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-space-sm border-b border-subtle">
            <TabsList aria-label="Catalog structure" className="min-w-0 border-b-0">
              <TabsTrigger value="drops" className="gap-space-xs">
                <span>Collections</span>
                <Badge variant="secondary" size="sm" className="tabular-nums">{filteredCollections.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="tree" className="gap-space-xs">
                <span>Category taxonomy</span>
                <Badge variant="secondary" size="sm" className="tabular-nums">{filteredCategories.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <div className="flex shrink-0 items-center gap-space-xs" role="group" aria-label="List density">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setViewDensity('list')}
                aria-pressed={viewDensity === 'list'}
                className={cn(viewDensity === 'list' && 'bg-surface-subtle text-primary')}
                title="List view"
                aria-label="List view"
              >
                <Icon name="view_list" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setViewDensity('grid')}
                aria-pressed={viewDensity === 'grid'}
                className={cn(viewDensity === 'grid' && 'bg-surface-subtle text-primary')}
                title="Card view"
                aria-label="Card view"
              >
                <Icon name="grid_view" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
              </Button>
            </div>
          </div>
        </Tabs>

        {/* Main work surface: list (2/3) and inspector (1/3) */}
        <div className="grid grid-cols-1 items-start gap-space-lg xl:grid-cols-12">
          <div className={`${noCollections ? 'xl:col-span-12' : 'xl:col-span-8'} flex min-w-0 flex-col gap-space-md`}>
            {!noCollections && (
              <FilterBar
                search={
                  <SearchInput
                    value={searchQuery}
                    onChange={(value) => setSearchQuery(value)}
                    onClear={() => setSearchQuery('')}
                    placeholder={isTree ? 'Search category name or slug' : 'Search collection title or code'}
                    label={isTree ? 'Search categories' : 'Search collections'}
                    className="w-full sm:w-72"
                  />
                }
                filters={
                  /* A collection and a category each carry one real status:
                     whether any product sits in it. The season and lifecycle
                     selects that stood here filtered on fields that neither a
                     collection nor a category holds. */
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    wrapperClassName="w-full sm:w-48"
                    aria-label={isTree ? 'Filter categories' : 'Filter collections'}
                  >
                    <option value="all">{isTree ? 'All categories' : 'All collections'}</option>
                    <option value="in-use">With products</option>
                    <option value="empty">Empty</option>
                  </Select>
                }
              />
            )}

            {activeTab === 'drops' && noCollections && (
              <EmptyState
                icon="auto_awesome"
                title="No collections yet"
                description="A collection groups products for a drop, a season or a lookbook. Create the first one to start merchandising."
                className="py-16"
                action={
                  <Button variant="primary" size="sm" onClick={() => setIsCollectionModalOpen(true)}>
                    <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                    <span>Create collection drop</span>
                  </Button>
                }
              />
            )}

            {activeTab === 'drops' && !noCollections && filteredCollections.length === 0 && (
              <EmptyState
                icon="search"
                title="No collection matches these filters"
                description="Clear the search or the filter to see every collection."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            )}

            {activeTab === 'drops' && filteredCollections.length > 0 && (
              <>
                <div className={viewDensity === 'grid' ? 'grid grid-cols-1 gap-space-sm md:grid-cols-2' : 'flex flex-col gap-space-sm'}>
                  {filteredCollections.map((col) => {
                    const isSelected = selectedDrop?.id === col.id;
                    const isGrid = viewDensity === 'grid';
                    return (
                      <Card
                        key={col.id}
                        onClick={() => setSelectedDropId(col.id)}
                        className={cn(
                          'cursor-pointer p-space-md transition-colors',
                          isSelected ? 'border-primary bg-primary-fixed/40' : 'hover:bg-surface-subtle'
                        )}
                      >
                        <div className={cn('flex flex-col gap-space-md', !isGrid && 'lg:flex-row lg:items-center lg:justify-between')}>
                          <div className="flex min-w-0 items-center gap-space-md">
                            <Checkbox
                              checked={!!selectedCheckboxes[col.id]}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleCheckbox(col.id);
                              }}
                              aria-label={`Select ${col.title}`}
                              className="shrink-0"
                            />
                            <Thumbnail src={col.thumbnail} alt={col.title} className="h-16 w-20 rounded-lg" />
                            <div className="flex min-w-0 flex-col gap-space-xs">
                              <div className="flex flex-wrap items-center gap-space-sm">
                                <span className="truncate text-subheading text-primary">{col.title}</span>
                                <Badge variant={col.statusVariant}>{col.status}</Badge>
                              </div>
                              <span className="truncate font-mono text-meta text-muted">{col.code}</span>
                              <div className="flex flex-wrap items-center gap-x-space-sm gap-y-space-xs text-meta text-secondary">
                                <span className="flex items-center gap-1 font-medium text-primary">
                                  <Icon name="checkroom" aria-hidden="true" className="material-symbols-outlined text-icon-sm text-accent" />
                                  {col.productLabel}
                                </span>
                                <span aria-hidden="true" className="text-faint">·</span>
                                <span>{col.variantLabel}</span>
                                {col.priceRange && (
                                  <>
                                    <span aria-hidden="true" className="text-faint">·</span>
                                    <span className="whitespace-nowrap tabular-nums text-primary">{col.priceRange}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Collection GMV and a CVR / AOV pair sat here. Neither is
                              attributed to a collection anywhere, so the two blocks
                              rendered their labels above empty values. These are
                              facts the collection does carry. */}
                          <dl className={cn('flex shrink-0 gap-space-xl', !isGrid && 'lg:text-right')}>
                            <div className="flex flex-col gap-0.5">
                              <dt className="text-meta text-muted">Units in stock</dt>
                              <dd className="text-subheading tabular-nums text-primary">{col.stock.toLocaleString('en-IN')}</dd>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <dt className="text-meta text-muted">Published</dt>
                              <dd className="text-subheading tabular-nums text-primary">
                                {col.publishedCount} of {col.productCount}
                              </dd>
                            </div>
                            <div className="hidden flex-col gap-0.5 sm:flex">
                              <dt className="text-meta text-muted">Updated</dt>
                              <dd className="whitespace-nowrap text-label text-secondary">{col.updatedLabel ?? 'Never'}</dd>
                            </div>
                          </dl>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <Card className="flex flex-wrap items-center gap-x-space-sm gap-y-space-xs px-space-md py-space-sm text-meta text-muted">
                  <span className="text-label font-semibold text-primary">{selectedCount} selected</span>
                  <span aria-hidden="true" className="text-faint">·</span>
                  <span>Showing {filteredCollections.length} of {mergedCollections.length} collections</span>
                </Card>
              </>
            )}

            {/* The two hand-written trees that stood below the live list
                ("Women's Ethnic Atelier, 48 sub-categories, 1,280 SKUs" and a
                men's equivalent) described a taxonomy that does not exist:
                categories are flat in the database and carry their own
                product counts. */}
            {activeTab === 'tree' && (
              <SectionCard
                title="Apparel taxonomy"
                description={
                  filteredCategories.length === dbCategories.length
                    ? `${dbCategories.length} ${dbCategories.length === 1 ? 'category' : 'categories'} in the catalog`
                    : `Showing ${filteredCategories.length} of ${dbCategories.length} categories`
                }
                action={
                  <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(true)}>
                    <Icon name="add" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                    <span>Add category</span>
                  </Button>
                }
                contentClassName={filteredCategories.length === 0 ? undefined : 'p-0'}
              >
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
                  <ul className={viewDensity === 'grid' ? 'grid grid-cols-1 gap-space-sm p-space-md md:grid-cols-2' : 'flex flex-col divide-y divide-subtle'}>
                    {filteredCategories.map((cat) => {
                      const isSelected = selectedCategory?.id === cat.id;
                      const products = cat.productCount ?? 0;
                      return (
                        <li
                          key={cat.id}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={cn(
                            'flex cursor-pointer items-center justify-between gap-space-md px-space-md py-space-sm transition-colors',
                            viewDensity === 'grid' && 'rounded-lg border border-subtle',
                            isSelected ? 'bg-primary-fixed/40' : 'hover:bg-surface-subtle',
                            isSelected && viewDensity === 'grid' && 'border-primary'
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-space-sm">
                            <Icon name="folder" aria-hidden="true" className="material-symbols-outlined text-icon text-accent" />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-label font-medium text-primary">{cat.name}</span>
                              <span className="truncate font-mono text-meta text-muted">/{cat.handle}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-space-sm">
                            <span className="whitespace-nowrap text-meta tabular-nums text-secondary">
                              {products} {products === 1 ? 'product' : 'products'}
                            </span>
                            <Button
                              variant="ghost"
                              size="iconXs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(cat.id, cat.name);
                              }}
                              className="hover:text-danger"
                              title={`Delete ${cat.name}`}
                              aria-label={`Delete ${cat.name}`}
                            >
                              <Icon name="delete" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>
            )}
          </div>

          {/* The inspector describes whatever the active tab lists. */}
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
              <div className="xl:col-span-4">
                <SectionCard
                  title={selectedCategory.name}
                  description={<span className="font-mono">/{selectedCategory.handle}</span>}
                  action={
                    <Badge variant={(selectedCategory.productCount ?? 0) > 0 ? 'success' : 'secondary'}>
                      {(selectedCategory.productCount ?? 0) > 0 ? 'In use' : 'Empty'}
                    </Badge>
                  }
                  contentClassName="flex flex-col gap-space-md"
                  footer={
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <Button variant="outline" size="sm" onClick={() => onNavigate?.('product-catalog')}>
                        <Icon name="inventory_2" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                        <span>View products</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(selectedCategory.id, selectedCategory.name)}
                        className="text-danger"
                      >
                        <Icon name="delete" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  }
                >
                  {selectedCategory.description && (
                    <p className="text-meta text-secondary">{selectedCategory.description}</p>
                  )}
                  <dl className="flex flex-col divide-y divide-subtle">
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
                      <div key={label} className="flex items-center justify-between gap-space-md py-space-sm first:pt-0 last:pb-0">
                        <dt className="text-meta text-muted">{label}</dt>
                        <dd className="truncate text-label tabular-nums text-primary">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </SectionCard>
              </div>
            )
          ) : noCollections ? null : !selectedDrop ? (
            <div className="xl:col-span-4">
              <EmptyState
                icon="auto_awesome"
                title="No collection selected"
                description="Pick a collection from the list to inspect it."
              />
            </div>
          ) : (
          <div className="xl:col-span-4">
            {/* A "LIVE APP" tag sat beside every collection's title; nothing
                records whether a collection is live, so it shows the one
                status a collection carries: whether it holds products. */}
            <SectionCard
              title={selectedDrop.title}
              description={<span className="font-mono">{selectedDrop.code}</span>}
              action={<Badge variant={selectedDrop.statusVariant}>{selectedDrop.status}</Badge>}
              contentClassName="flex flex-col gap-space-md"
            >
              {/* The hero image, the sorting weights and the placement targets
                  were `heroBanner`, `marginWeight`, `velocityWeight` and three
                  fixed channel rows. A collection stores none of them. These
                  are what it does hold. */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between gap-space-sm">
                  <span className="text-caption uppercase tracking-wider text-muted">Collection image</span>
                  <span className="text-meta text-muted">From the first product</span>
                </div>
                {selectedDrop.thumbnail ? (
                  <Thumbnail src={selectedDrop.thumbnail} alt={selectedDrop.title} className="h-32 w-full rounded-lg" />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-subtle bg-surface-subtle p-space-md text-center text-meta text-muted">
                    No product in this drop carries an image
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-space-xs">
                <span className="text-caption uppercase tracking-wider text-muted">Composition</span>
                <dl className="flex flex-col divide-y divide-subtle">
                  {[
                    ['Products', `${selectedDrop.productCount}`],
                    ['Variants', `${selectedDrop.variantCount}`],
                    ['Published', `${selectedDrop.publishedCount} of ${selectedDrop.productCount}`],
                    ['Units in stock', selectedDrop.stock.toLocaleString('en-IN')],
                    ['Price range', selectedDrop.priceRange ?? 'No priced variant'],
                    ['Last updated', selectedDrop.updatedLabel ?? 'Never'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-space-md py-space-sm last:pb-0">
                      <dt className="text-meta text-muted">{label}</dt>
                      <dd className="whitespace-nowrap text-label tabular-nums text-primary">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </SectionCard>
          </div>
          )}
        </div>

        <AppDialog
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          title="New category"
          description="Add a category to the catalog taxonomy."
          maxWidth="max-w-md"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="new-category-form" variant="primary" size="sm" disabled={isSubmitting}>
                <Icon name={isSubmitting ? 'hourglass_top' : 'check'} aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                <span>{isSubmitting ? 'Creating' : 'Create category'}</span>
              </Button>
            </>
          }
        >
          <form id="new-category-form" onSubmit={handleCreateCategory} className="flex flex-col gap-space-md">
            <FormInput
              id="category-name"
              label="Category name"
              required
              placeholder="e.g. Silk Dupattas"
              value={categoryForm.name}
              onChange={(val) => {
                setCategoryForm({
                  ...categoryForm,
                  name: val,
                  handle: categoryForm.handle ? categoryForm.handle : val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                });
              }}
            />
            <FormInput
              id="category-handle"
              label="URL handle"
              required
              placeholder="e.g. silk-dupattas"
              value={categoryForm.handle}
              onChange={(val) => setCategoryForm({ ...categoryForm, handle: val.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              inputClassName="font-mono"
            />
            <FormTextarea
              id="category-description"
              label="Description"
              rows={2}
              placeholder="Curated artisanal silk drapes crafted with authentic gold zari"
              helperText="Optional."
              value={categoryForm.description}
              onChange={(val) => setCategoryForm({ ...categoryForm, description: val })}
            />
          </form>
        </AppDialog>

        <AppDialog
          isOpen={isCollectionModalOpen}
          onClose={() => setIsCollectionModalOpen(false)}
          title="Create collection drop"
          description="Group products for a seasonal drop or a capsule lookbook."
          maxWidth="max-w-md"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsCollectionModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="new-collection-form" variant="primary" size="sm" disabled={isSubmitting}>
                <Icon name={isSubmitting ? 'hourglass_top' : 'check'} aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
                <span>{isSubmitting ? 'Creating' : 'Launch drop'}</span>
              </Button>
            </>
          }
        >
          <form id="new-collection-form" onSubmit={handleCreateCollection} className="flex flex-col gap-space-md">
            <FormInput
              id="collection-title"
              label="Collection title"
              required
              placeholder="e.g. Royal Benares Festive '25"
              value={collectionForm.title}
              onChange={(val) => {
                setCollectionForm({
                  ...collectionForm,
                  title: val,
                  handle: collectionForm.handle ? collectionForm.handle : val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                });
              }}
            />
            <FormInput
              id="collection-handle"
              label="URL handle"
              required
              placeholder="e.g. royal-benares-festive-25"
              value={collectionForm.handle}
              onChange={(val) => setCollectionForm({ ...collectionForm, handle: val.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              inputClassName="font-mono"
            />
          </form>
        </AppDialog>

        <ConfirmDialog
          isOpen={pendingCategoryDelete != null}
          onClose={() => setPendingCategoryDelete(null)}
          onConfirm={confirmDeleteCategory}
          isLoading={deleteCategoryMutation.isPending}
          title={`Delete ${pendingCategoryDelete?.name ?? 'category'}?`}
          message="This removes the category from the taxonomy. A category that still holds products cannot be deleted."
          confirmText="Delete category"
        />
      </PageBody>
    </PageContainer>
  );
}
