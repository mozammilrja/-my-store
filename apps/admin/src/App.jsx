import React, { useState, useEffect, Suspense, useCallback } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { HUBS } from './data/mockData';
import { ensureAdminAuth } from './lib/api';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { NotFound } from './components/layout/NotFound';
import { CommandPalette } from './components/common/CommandPalette';
import { NotificationsModal } from './components/common/NotificationsModal';
import { Toast } from './components/common/Toast';
import { SkeletonPage } from './components/shared/Skeleton';
import { MODULE_ROUTES } from './routes';

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
  const [currentHub, setCurrentHub] = useState(HUBS[0]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
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

  const currentPath = location.pathname.replace(/^\//, '').split('/')[0] || 'overview';

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
      navigate(path.startsWith('/') ? path : `/${path}`);
    },
    [navigate]
  );

  const handleSelectOrder = useCallback((orderId) => setSelectedOrderId(orderId), []);

  const handleSelectHub = (hub) => {
    setCurrentHub(hub);
    showToast({
      type: 'info',
      title: 'Fulfillment node switched',
      message: `Stock and dispatch views now show ${hub.name} (${hub.location}).`,
    });
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
          unreadCount={3}
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
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
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
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
