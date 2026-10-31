import React, { useState, useEffect, Suspense } from 'react';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { HUBS } from './data/mockData';
import { ensureAdminAuth } from './lib/api';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { CommandPalette } from './components/common/CommandPalette';
import { NotificationsModal } from './components/common/NotificationsModal';
import { Toast } from './components/common/Toast';
import { SkeletonPage } from './components/shared/Skeleton';

// Lazy-loaded domain module chunks for performance and code-splitting
const ExecutiveOverview = React.lazy(() => import('./components/overview/ExecutiveOverview').then(m => ({ default: m.ExecutiveOverview })));
const OrderManagement = React.lazy(() => import('./components/orders/OrderManagement').then(m => ({ default: m.OrderManagement })));
const ProductCatalog = React.lazy(() => import('./components/products/ProductCatalog').then(m => ({ default: m.ProductCatalog })));
const ReturnsAndExchanges = React.lazy(() => import('./components/returns/ReturnsAndExchanges').then(m => ({ default: m.ReturnsAndExchanges })));
const InventoryWarehouseManagement = React.lazy(() => import('./components/inventory/InventoryWarehouseManagement'));
const GstInvoiceManagement = React.lazy(() => import('./components/finance/GstInvoiceManagement'));
const AnalyticsAndReports = React.lazy(() => import('./components/analytics/AnalyticsAndReports'));
const PaymentsAndReconciliation = React.lazy(() => import('./components/finance/PaymentsAndReconciliation'));
const PurchaseOrdersAndSuppliers = React.lazy(() => import('./components/procurement/PurchaseOrdersAndSuppliers'));
const ShipmentsAndDispatch = React.lazy(() => import('./components/fulfillment/ShipmentsAndDispatch').then(m => ({ default: m.ShipmentsAndDispatch })));
const CategoriesAndCollections = React.lazy(() => import('./components/catalog/CategoriesAndCollections').then(m => ({ default: m.CategoriesAndCollections })));
const CustomersAndLoyalty = React.lazy(() => import('./components/customers/CustomersAndLoyalty').then(m => ({ default: m.CustomersAndLoyalty })));
const CreditNotesAndRefunds = React.lazy(() => import('./components/finance/CreditNotesAndRefunds').then(m => ({ default: m.CreditNotesAndRefunds })));
const PromotionsAndCoupons = React.lazy(() => import('./components/promotions/PromotionsAndCoupons').then(m => ({ default: m.PromotionsAndCoupons })));
const UsersAndRoleAccess = React.lazy(() => import('./components/admin/UsersAndRoleAccess').then(m => ({ default: m.UsersAndRoleAccess })));
const SystemSettings = React.lazy(() => import('./components/settings/SystemSettings').then(m => ({ default: m.SystemSettings })));
const GenericView = React.lazy(() => import('./components/common/GenericView').then(m => ({ default: m.GenericView })));

const KNOWN_MODULES = new Set([
  'overview',
  'analytics-and-reports',
  'order-management',
  'products',
  'returns-and-exchanges',
  'inventory-and-warehouses',
  'purchase-orders-and-suppliers',
  'gst-and-tax-invoices',
  'payments-and-reconciliation',
  'categories-and-collections',
  'shipments-and-dispatch',
  'customers-and-loyalty',
  'credit-notes-and-refunds',
  'promotions-and-coupons',
  'users-and-role-access',
  'system-settings',
]);

// The shape each module's chunk resolves into, so the first paint already
// matches the layout that is about to replace it.
const MODULE_SKELETONS = {
  'overview': { variant: 'dashboard', stats: 6, statsCols: 6 },
  'analytics-and-reports': { variant: 'analytics', stats: 6, statsCols: 6, columns: 7 },
  'order-management': { variant: 'split', columns: 7, rows: 8 },
  'products': { variant: 'cards', stats: 6, statsCols: 6 },
  'returns-and-exchanges': { variant: 'table', stats: 6, statsCols: 6, columns: 8 },
  'inventory-and-warehouses': { variant: 'table', stats: 6, statsCols: 6, columns: 8 },
  'purchase-orders-and-suppliers': { variant: 'table', stats: 6, statsCols: 6, columns: 7 },
  'gst-and-tax-invoices': { variant: 'table', stats: 6, statsCols: 6, columns: 8 },
  'payments-and-reconciliation': { variant: 'table', stats: 6, statsCols: 6, columns: 7 },
  'categories-and-collections': { variant: 'cards', stats: 6, statsCols: 6 },
  'shipments-and-dispatch': { variant: 'table', stats: 6, statsCols: 6, columns: 7 },
  'customers-and-loyalty': { variant: 'split', stats: 6, statsCols: 6, columns: 6 },
  'credit-notes-and-refunds': { variant: 'table', stats: 6, statsCols: 6, columns: 7 },
  'promotions-and-coupons': { variant: 'cards', stats: 6, statsCols: 6 },
  'users-and-role-access': { variant: 'table', stats: 6, statsCols: 6, columns: 6 },
  'system-settings': { variant: 'settings' },
};

function ViewLoadingFallback({ path }) {
  return <SkeletonPage {...(MODULE_SKELETONS[path] || { variant: 'table' })} />;
}

const getInitialPath = () => {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  return hash || 'overview';
};

export function App() {
  const [currentPath, setCurrentPath] = useState(getInitialPath);
  const [currentHub, setCurrentHub] = useState(HUBS[0]);
  const [selectedOrderId, setSelectedOrderId] = useState('EVR-984210-BLR');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Auth Check with Everwear API
  useEffect(() => {
    ensureAdminAuth().catch((err) => {
      console.warn('API authentication init notice:', err?.message);
    });
  }, []);

  // Browser Back/Forward navigation listener
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && hash !== currentPath) {
        setCurrentPath(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentPath]);

  const showToast = (toastObj) => {
    if (typeof toastObj === 'string') {
      setToast({ type: 'info', message: toastObj });
    } else if (toastObj && typeof toastObj === 'object') {
      setToast({
        type: toastObj.type || 'info',
        title: toastObj.title,
        message: typeof toastObj.message === 'string' ? toastObj.message : String(toastObj.message || ''),
      });
    } else {
      setToast(null);
    }
  };

  const handleNavigate = (path, orderId) => {
    setCurrentPath(path);
    window.location.hash = `#/${path}`;
    if (orderId) {
      setSelectedOrderId(orderId);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrderId(orderId);
  };

  const handleSelectHub = (hub) => {
    setCurrentHub(hub);
    showToast({
      type: 'info',
      title: 'Fulfillment Hub Switched',
      message: `Active node switched to ${hub.name} (${hub.location}). Real-time telemetry routed.`,
    });
  };

  const handleCommandAction = (action) => {
    if (action === 'flash-sync') {
      showToast({
        type: 'success',
        title: 'Flash Sync Complete',
        message: 'Synchronized telemetry across all 4 national clusters in 142ms.',
      });
    } else if (action === 'export-gst') {
      showToast({
        type: 'success',
        title: 'GST Compliance CSV Generated',
        message: 'Monthly tax register compiled for download.',
      });
    } else if (action === 'bulk-manifest') {
      showToast({
        type: 'info',
        title: 'Manifest Batch Generated',
        message: 'Batch #4409 generated for 14 staged orders.',
      });
    } else if (action === 'mark-all-read') {
      showToast({
        type: 'info',
        title: 'Alerts Acknowledged',
        message: '3 operational exception triggers cleared.',
      });
    }
  };

  return (
    <div className="bg-surface-canvas min-h-screen text-primary antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Fixed Sidebar */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={handleNavigate}
        currentHub={currentHub}
        onSelectHub={handleSelectHub}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`transition-[padding] duration-300 ease-out-expo pl-0 ${
 isCollapsed ? 'lg:pl-sidebar-collapsed' : 'lg:pl-sidebar'
 }`}
      >
        {/* Top Header */}
        <Header
          isCollapsed={isCollapsed}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          currentHub={currentHub}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          unreadCount={3}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Dynamic Route View */}
        <main id="main-content" className="w-full min-h-screen bg-surface-canvas pt-header">
          <div className="mx-auto w-full max-w-content px-4 py-space-lg md:px-space-xl md:py-space-xl">
          <ErrorBoundary resetKey={currentPath}>
          <Suspense fallback={<ViewLoadingFallback path={currentPath} />}>
            {currentPath === 'overview' && (
            <ExecutiveOverview
              onNavigate={handleNavigate}
              onShowToast={showToast}
              onSelectOrder={handleSelectOrder}
            />
          )}

          {currentPath === 'analytics-and-reports' && (
            <AnalyticsAndReports
              onNavigate={handleNavigate}
              onShowToast={(msg) => showToast({ type: 'info', title: 'Analytics Export', message: msg })}
            />
          )}

          {currentPath === 'order-management' && (
            <OrderManagement
              onShowToast={showToast}
              currentHub={currentHub}
              selectedOrderId={selectedOrderId}
              onSelectOrder={handleSelectOrder}
            />
          )}

          {currentPath === 'products' && (
            <ProductCatalog
              onShowToast={showToast}
              currentHub={currentHub}
            />
          )}

          {currentPath === 'returns-and-exchanges' && (
            <ReturnsAndExchanges
              onShowToast={showToast}
              currentHub={currentHub}
            />
          )}

          {currentPath === 'inventory-and-warehouses' && (
            <InventoryWarehouseManagement
              onShowToast={(msg) => showToast({ type: 'success', title: 'Inventory Update', message: msg })}
              currentHub={currentHub}
            />
          )}

          {currentPath === 'purchase-orders-and-suppliers' && (
            <PurchaseOrdersAndSuppliers
              onNavigate={handleNavigate}
              onShowToast={(msg) => showToast({ type: 'success', title: 'Procurement Update', message: msg })}
            />
          )}

          {currentPath === 'gst-and-tax-invoices' && (
            <GstInvoiceManagement
              onShowToast={(msg) => showToast({ type: 'success', title: 'Tax & Compliance', message: msg })}
              currentHub={currentHub}
            />
          )}

          {currentPath === 'payments-and-reconciliation' && (
            <PaymentsAndReconciliation
              onNavigate={handleNavigate}
              onShowToast={(msg) => showToast({ type: 'success', title: 'Settlement Update', message: msg })}
            />
          )}

          {currentPath === 'categories-and-collections' && (
            <CategoriesAndCollections
              onNavigate={handleNavigate}
              onShowToast={(msg) => showToast({ type: 'success', title: 'Catalog Drop', message: msg })}
            />
          )}

          {currentPath === 'shipments-and-dispatch' && (
            <ShipmentsAndDispatch
              onNavigate={handleNavigate}
              onShowToast={(msg) => showToast({ type: 'info', title: 'Dispatch Telemetry', message: msg })}
            />
          )}

          {currentPath === 'customers-and-loyalty' && (
            <CustomersAndLoyalty
              onNavigate={handleNavigate}
              onShowToast={(msg) => showToast({ type: 'info', title: 'VIP Clienteling', message: msg })}
            />
          )}

          {currentPath === 'credit-notes-and-refunds' && (
            <CreditNotesAndRefunds
              onNavigate={handleNavigate}
              onShowToast={(msg) => showToast({ type: 'success', title: 'Credit Note Ledger', message: msg })}
            />
          )}

          {currentPath === 'promotions-and-coupons' && (
            <PromotionsAndCoupons
              onNavigate={handleNavigate}
              onShowToast={(msg) => showToast({ type: 'info', title: 'Promotion Engine', message: msg })}
            />
          )}

          {currentPath === 'users-and-role-access' && (
            <UsersAndRoleAccess
              onNavigate={handleNavigate}
              onShowToast={(msg) => showToast({ type: 'info', title: 'RBAC Policy', message: msg })}
            />
          )}

          {currentPath === 'system-settings' && (
            <SystemSettings
              onNavigate={handleNavigate}
              onShowToast={(msg) => showToast({ type: 'info', title: 'System Governance', message: msg })}
            />
          )}

            {!KNOWN_MODULES.has(currentPath) && (
              <GenericView
                path={currentPath}
                onNavigate={handleNavigate}
                onShowToast={showToast}
              />
            )}
          </Suspense>
          </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* ⌘K Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onAction={handleCommandAction}
      />

      {/* Operational Alerts Modal */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onAction={handleCommandAction}
      />

      {/* Floating Operational Toast */}
      <Toast
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

export default App;
