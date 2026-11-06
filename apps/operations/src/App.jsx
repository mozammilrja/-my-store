import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { api } from './lib/api';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { NotFound } from './components/layout/NotFound';
import { CommandPalette } from './components/common/CommandPalette';
import { NotificationsModal } from './components/common/NotificationsModal';
import { Toast } from './components/common/Toast';
import { SkeletonPage } from './components/shared/Skeleton';
import { MODULE_ROUTES } from './routes';
import { AccountContent } from './portal/AccountPage';

/** A module path ("products", "/order-management?q=x") as its URL in the portal. */
export const adminPath = (path) => (path.startsWith('/admin/') ? path : `/admin/${path.replace(/^\//, '')}`);

// The shape each module's chunk resolves into, so the first paint already
// matches the layout that is about to replace it.
const MODULE_SKELETONS = {
  'overview': { variant: 'dashboard', stats: 6, statsCols: 6 },
  'analytics-and-reports': { variant: 'analytics', stats: 0, columns: 7 },
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

/**
 * Renders a module with the shell's shared handlers plus whatever the URL
 * carries, so modules keep the prop signatures they already had instead of
 * every one of them learning about the router.
 */
function ModuleRoute({ component: Component, path }) {
  const context = useOutletContext();
  const params = useParams();
  return (
    <ErrorBoundary resetKey={path}>
      <Suspense fallback={<ViewLoadingFallback path={path} />}>
        <Component {...context} routeParams={params} />
      </Suspense>
    </ErrorBoundary>
  );
}

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  // The store's own warehouses, from the API. Picking one in the sidebar opens
  // it in Warehouse Operations; nothing else on screen is filtered by it.
  const warehousesQuery = useQuery({
    queryKey: ['admin', 'warehouses', 'shell'],
    queryFn: () => api('/admin/warehouses'),
    staleTime: 5 * 60_000,
  });
  const hubs = useMemo(
    () =>
      (warehousesQuery.data?.warehouses ?? [])
        .filter((w) => !w.sellerId && w.status !== 'inactive')
        .map((w) => ({ id: w.code, warehouseId: w._id, name: w.name, location: [w.city, w.state].filter(Boolean).join(', '), isDefault: !!w.isDefault })),
    [warehousesQuery.data]
  );
  const [hubId, setHubId] = useState(null);
  const currentHub = hubs.find((h) => h.warehouseId === hubId) ??
    hubs.find((h) => h.isDefault) ??
    hubs[0] ?? { id: 'No warehouse', warehouseId: null, name: warehousesQuery.isLoading ? 'Loading warehouses' : 'No warehouse set up', location: '' };
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Cmd/Ctrl+K opens the command palette from anywhere, as the search hint says.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // The admin lives under /admin in the operations portal.
  const currentPath = location.pathname.replace(/^\/admin\/?/, '').split('/')[0] || 'overview';

  // A new page starts at the top, but staying on the same page while only the
  // query changes (a filter, a page number) must not yank the viewport.
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const showToast = useCallback((toastObj) => {
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
  }, []);

  const handleNavigate = useCallback(
    (path, orderId) => {
      if (orderId) setSelectedOrderId(orderId);
      navigate(adminPath(path));
    },
    [navigate]
  );

  const handleSelectOrder = useCallback((orderId) => setSelectedOrderId(orderId), []);

  const handleSelectHub = (hub) => {
    setHubId(hub.warehouseId);
    navigate(adminPath(`warehouse-operations?warehouse=${encodeURIComponent(hub.warehouseId)}`));
  };

  const handleCommandAction = (action) => {
    if (action === 'mark-all-read') {
      showToast({ type: 'info', title: 'Alerts acknowledged', message: 'Operational alerts cleared.' });
    }
  };

  const outletContext = {
    onNavigate: handleNavigate,
    onShowToast: showToast,
    onSelectOrder: handleSelectOrder,
    selectedOrderId,
    currentHub,
  };

  return (
    <div className="bg-surface-canvas min-h-screen text-primary antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      <Sidebar
        currentPath={currentPath}
        onNavigate={handleNavigate}
        currentHub={currentHub}
        hubs={hubs}
        onSelectHub={handleSelectHub}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div
        className={`transition-[padding] duration-300 ease-out-expo pl-0 ${
          isCollapsed ? 'lg:pl-sidebar-collapsed' : 'lg:pl-sidebar'
        }`}
      >
        <Header
          isCollapsed={isCollapsed}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          currentHub={currentHub}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          unreadCount={0}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main id="main-content" className="w-full min-h-screen bg-surface-canvas pt-header">
          <div className="w-full px-4 py-space-lg md:px-space-xl md:py-space-xl">
            <Outlet context={outletContext} />
          </div>
        </main>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onAction={handleCommandAction}
      />

      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onAction={handleCommandAction}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export function App() {
  return (
    <Routes>
      {/* Mounted at /admin/* by the portal, which has already checked the session holds an admin account. */}
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        {MODULE_ROUTES.map(({ path, element, detail }) => (
          <React.Fragment key={path}>
            <Route path={path} element={<ModuleRoute component={element} path={path} />} />
            {(detail ?? []).map((suffix) => (
              <Route
                key={`${path}/${suffix}`}
                path={`${path}/${suffix}`}
                element={<ModuleRoute component={element} path={path} />}
              />
            ))}
          </React.Fragment>
        ))}
        {/* Account & security, inside the admin shell. */}
        <Route path="account" element={<ErrorBoundary resetKey="account"><AccountContent /></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
