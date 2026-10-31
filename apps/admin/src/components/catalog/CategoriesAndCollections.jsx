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
import {
  useCategoriesQuery,
  useCollectionsQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useCreateCollectionMutation
} from '../../hooks/useAdminQueries';

export function CategoriesAndCollections({ onNavigate, onShowToast }) {
  const [activeTab, setActiveTab] = useState('drops'); // 'drops', 'tree', 'rules', 'channels'
  const [selectedDropId, setSelectedDropId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('All Seasons (2024-25)');
  const [channelFilter, setChannelFilter] = useState('All Omnichannel');
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
    const fromDb = dbCollections.map((col, idx) => ({
      id: col.id,
      handle: col.handle,
      code: `DROP-${col.handle.toUpperCase()}`,
      title: col.title,
      productCount: col.productCount ?? 0,
      skuCount: `${col.productCount ?? 0} ${col.productCount === 1 ? 'product' : 'products'}`,
      status: (col.productCount ?? 0) > 0 ? 'In use' : 'Empty',
      statusColor:
        (col.productCount ?? 0) > 0
          ? 'bg-status-success-bg text-success'
          : 'bg-surface-subtle text-muted',
      isHero: idx === 0,
    }));

    return fromDb;
  }, [dbCollections]);



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
              onClick={() => onShowToast?.("Exporting taxonomy structure to CSV/JSON format...")}
              icon="file_download"
            >
              Export Taxonomy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowToast?.("Opening dynamic visual reordering rules editor...")}
              icon="reorder"
            >
              Reorder Rules
            </Button>
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
      <ContentGrid columns={5}>
        <StatsCard
          label="Active Categories"
          value="142"
          change="+8 this season"
          changeType="positive"
          icon="account_tree"
          subtitle="4 Global Depts · 18 Sub-nodes"
        />
        <StatsCard
          label="Curated Drops"
          value="38 drops"
          change="6 Live"
          changeType="neutral"
          icon="auto_awesome"
          subtitle="4 Scheduled · 28 Archived"
        />
        <StatsCard
          label="Merch Rules"
          value="24 Active"
          change="Smart Boost"
          changeType="neutral"
          icon="tune"
          subtitle="Avg Margin Lift +4.8%"
        />
        <StatsCard
          label="Orphan SKUs"
          value="0 SKUs"
          change="100% Synced"
          changeType="positive"
          icon="verified"
          subtitle="Strict Taxonomy Gate Active"
        />
        <StatsCard
          label="Omnichannel Feed"
          value="99.9%"
          change="Healthy"
          changeType="positive"
          icon="cloud_sync"
          subtitle="Myntra · Nykaa · Web · iOS"
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
                  38
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
                  142
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
                  24
                </span>
              </button>
              <button
                onClick={() => setActiveTab('channels')}
                className={`px-space-md py-1.5 rounded-lg text-label transition-all ${
 activeTab === 'channels'
 ? 'bg-primary-container text-on-accent shadow-sm font-semibold'
 : 'hover:bg-surface-subtle text-muted'
 }`}
                type="button"
              >
                <span>Marketplace Channels</span>
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
              {/* Channel select */}
              <div className="w-44">
                <Select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="h-8 text-meta"
                >
                  <option>All Omnichannel</option>
                  <option>Mobile App Exclusives</option>
                  <option>Storefront Web</option>
                  <option>Myntra Syndicate</option>
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
                          <span className={`absolute bottom-1 right-1 px-1 py-px rounded text-caption uppercase ${
 col.tag === 'Oct 15' ? 'bg-status-warning-solid text-on-accent' : 'bg-scrim/70 text-on-accent'
 }`}>
                            {col.tag}
                          </span>
                        </div>
                        {/* Metadata & Title */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-subheading text-primary font-semibold truncate hover:text-accent">
                              {col.title}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-semibold ${
 col.badgeType === 'success'
 ? 'bg-status-success-bg text-success'
 : col.badgeType === 'warning'
 ? 'bg-status-warning-bg text-warning'
 : 'bg-surface-subtle text-muted'
 }`}>
                              {col.badge}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-surface-subtle text-caption text-muted">
                              {col.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-space-sm mt-1 text-body text-secondary flex-wrap">
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <Icon name="checkroom" className="material-symbols-outlined text-icon-sm text-accent" />
                              {col.skusCount} SKUs
                            </span>
                            <span>•</span>
                            <span>
                              Price Range: <strong className="text-primary font-semibold">{col.priceRange}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-accent font-medium flex items-center gap-0.5">
                              <Icon name={col.ruleIcon} className="material-symbols-outlined text-icon-sm" />
                              {col.ruleText}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantitative Metrics Block */}
                      <div className="flex items-center gap-space-lg shrink-0 justify-between lg:justify-end pl-6 lg:pl-0">
                        <div className="flex flex-col text-right">
                          <span className="text-caption text-muted">COLLECTION GMV</span>
                          <span className="text-subheading text-primary font-semibold">{col.gmv}</span>
                          <span className={`text-micro ${col.gmvSubColor}`}>{col.gmvSub}</span>
                        </div>
                        <div className="hidden sm:flex flex-col text-right">
                          <span className="text-caption text-muted">CVR / AOV</span>
                          <span className="text-body text-primary font-medium">{col.cvrAov}</span>
                          <span className="text-micro text-muted">{col.channelsText}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShowToast?.(`Editing dynamic rules for ${col.code}...`);
                            }}
                            className="p-1.5 rounded-lg bg-surface-subtle text-muted hover:text-primary hover:bg-border-subtle"
                            title="Edit Rule Set"
                            type="button"
                          >
                            <Icon name="tune" className="material-symbols-outlined text-icon-md" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShowToast?.(`Opening options for ${col.code}...`);
                            }}
                            className="p-1.5 rounded-lg bg-surface-subtle text-muted hover:text-primary hover:bg-border-subtle"
                            title="View Options"
                            type="button"
                          >
                            <Icon name="more_vert" className="material-symbols-outlined text-icon-md" />
                          </button>
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
                  <span>Showing {filteredCollections.length} of 38 Active Drops</span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <button
                    onClick={() => onShowToast?.(`Bulk rule applied to ${selectedCount} selected collections.`)}
                    className="px-space-sm py-1 rounded-lg bg-surface-subtle hover:bg-border-subtle text-primary text-label border border-subtle transition-colors"
                    type="button"
                  >
                    Bulk Rule Apply
                  </button>
                  <button
                    onClick={() => onShowToast?.(`Omnichannel sync triggered for active catalog drops.`)}
                    className="px-space-sm py-1 rounded-lg bg-surface-subtle hover:bg-border-subtle text-primary text-label border border-subtle transition-colors"
                    type="button"
                  >
                    Sync Channels
                  </button>
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
                <button
                  onClick={() => onShowToast?.('Creating custom merchandising rule...')}
                  className="px-3 py-1.5 bg-primary-container text-on-accent text-meta font-semibold rounded-lg shadow-sm"
                >
                  + Create Rule
                </button>
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

          {/* TAB 4: Marketplace Channels */}
          {activeTab === 'channels' && (
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-subtle shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-primary">Omnichannel Catalog Feed Syndication</h3>
                  <p className="text-meta text-muted">Live schema transformation & inventory sync pipelines</p>
                </div>
                <button
                  onClick={() => onShowToast?.('Force syndicating all active channel feeds...')}
                  className="px-3 py-1.5 bg-primary-container text-on-accent text-meta font-semibold rounded-lg shadow-sm"
                >
                  Force Feed Resync
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-surface-canvas rounded-xl border border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-meta text-primary">Myntra Brand Store Feed</span>
                    <span className="w-2 h-2 rounded-full bg-status-success"></span>
                  </div>
                  <p className="text-meta text-muted">Synced: 1,480 SKUs · HSN Validation Active · SLA 99.9%</p>
                  <span className="text-micro font-mono text-success whitespace-nowrap">Last ping: 42s ago</span>
                </div>
                <div className="p-4 bg-surface-canvas rounded-xl border border-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-meta text-primary">Nykaa Fashion Premium API</span>
                    <span className="w-2 h-2 rounded-full bg-status-success"></span>
                  </div>
                  <p className="text-meta text-muted">Synced: 680 Curated Ethnic SKUs · Lookbook Media Synced</p>
                  <span className="text-micro font-mono text-success whitespace-nowrap">Last ping: 2m ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 4-COLUMNS: Visual Merchandising Inspector Drawer (Exact 1:1 with Stitch design) */}
        {!selectedDrop ? (
          <EmptyState icon="collections_bookmark" title="No collection selected" message="Pick a collection from the list to inspect it." />
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

            {/* Banner & Media Lookbook Preview Container */}
            <div className="space-y-space-xs">
              <div className="flex items-center justify-between text-caption text-muted">
                <span>STOREFRONT HERO MEDIA</span>
                <span>1920×600 (Desktop) · 1080×1350 (App)</span>
              </div>
              <div className="relative rounded-lg overflow-hidden bg-surface-canvas shadow-inner group border border-subtle">
                <div
                  className="w-full h-32 bg-cover bg-center transition-all duration-300"
                  style={{ backgroundImage: `url('${selectedDrop.heroBanner}')` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-scrim/80 via-scrim/20 to-transparent flex flex-col justify-end p-2.5">
                  <span className="text-on-accent text-subheading font-semibold tracking-tight leading-tight">
                    {selectedDrop.heroBannerTitle}
                  </span>
                  <span className="text-on-accent/80 text-micro">
                    {selectedDrop.heroBannerSub}
                  </span>
                </div>
                <button
                  onClick={() => onShowToast?.('Opening media asset manager to replace storefront hero...')}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-scrim/60 hover:bg-black text-on-accent text-meta flex items-center gap-1 backdrop-blur-sm transition-colors"
                  type="button"
                >
                  <Icon name="photo_camera" className="material-symbols-outlined text-icon-sm" />
                  <span>Replace Media</span>
                </button>
              </div>
            </div>

            {/* Merchandising Algorithm Configuration */}
            <div className="space-y-space-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="text-caption text-muted uppercase">SORTING & ALGORITHM LOGIC</span>
                <span className="text-caption text-accent font-semibold">{selectedDrop.engineVersion}</span>
              </div>
              <div className="p-space-sm bg-surface-canvas rounded-lg border border-subtle flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="auto_graph" className="material-symbols-outlined text-icon-md text-accent" />
                    <span className="text-label font-semibold text-primary">
                      {selectedDrop.algoTitle}
                    </span>
                  </div>
                  <Icon name="info" className="material-symbols-outlined text-icon text-muted cursor-pointer" />
                </div>
                <p className="text-meta text-muted leading-relaxed">
                  {selectedDrop.algoDesc}
                </p>
                <div className="flex items-center justify-between pt-1 text-caption text-muted">
                  <span>MARGIN WEIGHT: {selectedDrop.marginWeight}%</span>
                  <span>VELOCITY: {selectedDrop.velocityWeight}%</span>
                  <span>FRESHNESS: {selectedDrop.freshnessWeight}%</span>
                </div>
                {/* Visual Weight Progress Bar */}
                <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex">
                  <div className="bg-primary-container h-full" style={{ width: `${selectedDrop.marginWeight}%` }}></div>
                  <div className="bg-fashion-magenta h-full" style={{ width: `${selectedDrop.velocityWeight}%` }}></div>
                  <div className="bg-status-info h-full" style={{ width: `${selectedDrop.freshnessWeight}%` }}></div>
                </div>
              </div>
            </div>

            {/* Pinned Hero SKUs (Drag & Drop Visual Grid) */}

            {/* Facets & Filters Allowed on Storefront */}

            {/* Omnichannel Visibility Matrix */}
            <div className="space-y-space-xs pt-1">
              <span className="text-caption text-muted uppercase">
                STOREFRONT PLACEMENT TARGETS
              </span>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-2 rounded-lg bg-surface-canvas border border-subtle cursor-pointer hover:bg-surface-subtle transition-colors">
                  <div className="flex items-center gap-2">
                    <Icon name="smartphone" className="material-symbols-outlined text-icon text-accent" />
                    <span className="text-body font-medium text-primary">iOS & Android App (Slot A)</span>
                  </div>
                  <input defaultChecked className="w-4 h-4 rounded text-accent accent-primary-container cursor-pointer" type="checkbox" />
                </label>
                <label className="flex items-center justify-between p-2 rounded-lg bg-surface-canvas border border-subtle cursor-pointer hover:bg-surface-subtle transition-colors">
                  <div className="flex items-center gap-2">
                    <Icon name="desktop_windows" className="material-symbols-outlined text-icon text-info" />
                    <span className="text-body font-medium text-primary">Desktop Web Top Carousel</span>
                  </div>
                  <input defaultChecked className="w-4 h-4 rounded text-accent accent-primary-container cursor-pointer" type="checkbox" />
                </label>
                <label className="flex items-center justify-between p-2 rounded-lg bg-surface-canvas border border-subtle cursor-pointer hover:bg-surface-subtle transition-colors">
                  <div className="flex items-center gap-2">
                    <Icon name="storefront" className="material-symbols-outlined text-icon text-muted" />
                    <span className="text-body font-medium text-primary">Myntra Brand Store Landing</span>
                  </div>
                  <input defaultChecked className="w-4 h-4 rounded text-accent accent-primary-container cursor-pointer" type="checkbox" />
                </label>
              </div>
            </div>

            {/* Bottom Action Commit Button */}
            <div className="pt-2 flex flex-col space-y-2">
              <button
                onClick={() => onShowToast?.(`Published ${selectedDrop.title} changes to live storefronts.`)}
                className="w-full h-9 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-accent text-label-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                type="button"
              >
                <Icon name="publish" className="material-symbols-outlined text-icon-md" />
                <span>Save & Publish to Live Storefront</span>
              </button>
              <button
                onClick={() => onShowToast?.(`Opening live storefront preview modal...`)}
                className="w-full h-8 rounded-lg bg-surface-subtle hover:bg-border-subtle text-primary text-label flex items-center justify-center gap-1.5 transition-colors border border-subtle"
                type="button"
              >
                <Icon name="visibility" className="material-symbols-outlined text-icon text-muted" />
                <span>Preview Live Storefront Experience</span>
              </button>
            </div>
          </div>

          {/* Quick Micro-Widget: Feed Syndication Sync Status */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-subtle p-space-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-pulse"></span>
              <div className="flex flex-col">
                <span className="text-meta font-semibold text-primary">Edge Cache & CDN Invalidation</span>
                <span className="text-micro text-muted">Last purged 4 mins ago across 14 Cloudflare nodes</span>
              </div>
            </div>
            <button
              onClick={() => onShowToast?.('Cloudflare CDN edge cache purged for collections.')}
              className="text-muted hover:text-primary text-meta uppercase underline"
              type="button"
            >
              Purge
            </button>
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
