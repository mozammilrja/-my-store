import React, { useState, useEffect } from 'react';
import { HUBS } from './data/mockData';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ExecutiveOverview } from './components/overview/ExecutiveOverview';
import { OrderManagement } from './components/orders/OrderManagement';
import { ProductCatalog } from './components/products/ProductCatalog';
import { ReturnsAndExchanges } from './components/returns/ReturnsAndExchanges';
import InventoryWarehouseManagement from './components/inventory/InventoryWarehouseManagement';
import GstInvoiceManagement from './components/finance/GstInvoiceManagement';
import { AnalyticsAndReports } from './components/analytics/AnalyticsAndReports';
import { PaymentsAndReconciliation } from './components/finance/PaymentsAndReconciliation';
import { PurchaseOrdersAndSuppliers } from './components/procurement/PurchaseOrdersAndSuppliers';
import { ShipmentsAndDispatch } from './components/fulfillment/ShipmentsAndDispatch';
import { CategoriesAndCollections } from './components/catalog/CategoriesAndCollections';
import { CustomersAndLoyalty } from './components/customers/CustomersAndLoyalty';
import { CreditNotesAndRefunds } from './components/finance/CreditNotesAndRefunds';
import { PromotionsAndCoupons } from './components/promotions/PromotionsAndCoupons';
import { UsersAndRoleAccess } from './components/admin/UsersAndRoleAccess';
import { SystemSettings } from './components/settings/SystemSettings';
import { GenericView } from './components/common/GenericView';
import { CommandPalette } from './components/common/CommandPalette';
import { NotificationsModal } from './components/common/NotificationsModal';
import { Toast } from './components/common/Toast';

export function App() {
  const [currentPath, setCurrentPath] = useState('overview');
  const [currentHub, setCurrentHub] = useState(HUBS[0]);
  const [selectedOrderId, setSelectedOrderId] = useState('EVR-984210-BLR');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Toggle Dark Mode on html root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const showToast = (toastObj) => {
    setToast(toastObj);
  };

  const handleNavigate = (path, orderId) => {
    setCurrentPath(path);
    if (orderId) {
      setSelectedOrderId(orderId);
    }
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
      message: `Active node switched to ${hub.name} (${hub.location}). Telemetry routed.`,
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
    <div className="bg-surface-canvas min-h-screen text-text-primary antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Fixed Sidebar */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={handleNavigate}
        currentHub={currentHub}
        onSelectHub={handleSelectHub}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content Area */}
      <div 
        className={`transition-all duration-300 ${
          isCollapsed ? 'pl-[72px]' : 'pl-[280px]'
        }`}
      >
        {/* Top Header */}
        <Header
          isCollapsed={isCollapsed}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          currentHub={currentHub}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          unreadCount={3}
        />

        {/* Dynamic Route View */}
        <main className="w-full pt-16 bg-surface-canvas min-h-screen px-space-lg py-space-lg">
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

          {currentPath !== 'overview' && 
           currentPath !== 'analytics-and-reports' &&
           currentPath !== 'order-management' && 
           currentPath !== 'products' && 
           currentPath !== 'returns-and-exchanges' && 
           currentPath !== 'inventory-and-warehouses' && 
           currentPath !== 'purchase-orders-and-suppliers' &&
           currentPath !== 'gst-and-tax-invoices' && 
           currentPath !== 'payments-and-reconciliation' &&
           currentPath !== 'categories-and-collections' &&
           currentPath !== 'shipments-and-dispatch' &&
           currentPath !== 'customers-and-loyalty' &&
           currentPath !== 'credit-notes-and-refunds' &&
           currentPath !== 'promotions-and-coupons' &&
           currentPath !== 'users-and-role-access' &&
           currentPath !== 'system-settings' && (
            <GenericView
              path={currentPath}
              onNavigate={handleNavigate}
              onShowToast={showToast}
            />
          )}
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
