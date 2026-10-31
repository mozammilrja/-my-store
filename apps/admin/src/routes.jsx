import React from 'react';

/**
 * Every admin route in one place, so the router, the sidebar and the
 * breadcrumbs cannot disagree about what exists or what a page is called.
 *
 * `path` is the real URL segment. Modules keep the slugs they already had so
 * existing links and bookmarks still resolve; the detail routes beneath them
 * are new.
 */

const lazyDefault = (loader, name) =>
  React.lazy(() => loader().then((m) => ({ default: name ? m[name] : m.default })));

export const ExecutiveOverview = lazyDefault(
  () => import('./components/overview/ExecutiveOverview'),
  'ExecutiveOverview'
);
export const AnalyticsAndReports = lazyDefault(() => import('./components/analytics/AnalyticsAndReports'));
export const OrderManagement = lazyDefault(
  () => import('./components/orders/OrderManagement'),
  'OrderManagement'
);
export const ProductCatalog = lazyDefault(
  () => import('./components/products/ProductCatalog'),
  'ProductCatalog'
);
export const ReturnsAndExchanges = lazyDefault(
  () => import('./components/returns/ReturnsAndExchanges'),
  'ReturnsAndExchanges'
);
export const InventoryWarehouseManagement = lazyDefault(
  () => import('./components/inventory/InventoryWarehouseManagement')
);
export const GstInvoiceManagement = lazyDefault(() => import('./components/finance/GstInvoiceManagement'));
export const PaymentsAndReconciliation = lazyDefault(
  () => import('./components/finance/PaymentsAndReconciliation')
);
export const PurchaseOrdersAndSuppliers = lazyDefault(
  () => import('./components/procurement/PurchaseOrdersAndSuppliers')
);
export const ShipmentsAndDispatch = lazyDefault(
  () => import('./components/fulfillment/ShipmentsAndDispatch'),
  'ShipmentsAndDispatch'
);
export const CategoriesAndCollections = lazyDefault(
  () => import('./components/catalog/CategoriesAndCollections'),
  'CategoriesAndCollections'
);
export const CustomersAndLoyalty = lazyDefault(
  () => import('./components/customers/CustomersAndLoyalty'),
  'CustomersAndLoyalty'
);
export const CreditNotesAndRefunds = lazyDefault(
  () => import('./components/finance/CreditNotesAndRefunds'),
  'CreditNotesAndRefunds'
);
export const PromotionsAndCoupons = lazyDefault(
  () => import('./components/promotions/PromotionsAndCoupons'),
  'PromotionsAndCoupons'
);
export const UsersAndRoleAccess = lazyDefault(
  () => import('./components/admin/UsersAndRoleAccess'),
  'UsersAndRoleAccess'
);
export const SystemSettings = lazyDefault(
  () => import('./components/settings/SystemSettings'),
  'SystemSettings'
);

/**
 * The sidebar's sections. `path` is the module root; `detail` lists the nested
 * routes that should still light this item up in the nav.
 */
export const MENU_SECTIONS = [
  {
    title: 'Core',
    items: [
      { path: 'overview', label: 'Overview', icon: 'dashboard', element: ExecutiveOverview },
      {
        path: 'analytics-and-reports',
        label: 'Analytics & Reports',
        icon: 'insights',
        element: AnalyticsAndReports,
      },
    ],
  },
  {
    title: 'Catalog & Inventory',
    items: [
      {
        path: 'products',
        label: 'Products',
        icon: 'checkroom',
        element: ProductCatalog,
        detail: ['new', ':productId', ':productId/edit'],
      },
      {
        path: 'categories-and-collections',
        label: 'Categories & Collections',
        icon: 'folder_open',
        element: CategoriesAndCollections,
      },
      {
        path: 'inventory-and-warehouses',
        label: 'Inventory & Warehouses',
        icon: 'warehouse',
        element: InventoryWarehouseManagement,
        badgeKey: 'lowStock',
        badgeTone: 'warning',
      },
      {
        path: 'purchase-orders-and-suppliers',
        label: 'Purchase Orders',
        icon: 'local_shipping',
        element: PurchaseOrdersAndSuppliers,
      },
    ],
  },
  {
    title: 'Fulfillment & Orders',
    items: [
      {
        path: 'order-management',
        label: 'Order Management',
        icon: 'shopping_bag',
        element: OrderManagement,
        badgeKey: 'toShip',
        badgeTone: 'info',
        detail: [':orderId'],
      },
      {
        path: 'returns-and-exchanges',
        label: 'Returns & Exchanges',
        icon: 'swap_horizontal_circle',
        element: ReturnsAndExchanges,
      },
      {
        path: 'shipments-and-dispatch',
        label: 'Shipments & Dispatch',
        icon: 'flight_takeoff',
        element: ShipmentsAndDispatch,
      },
    ],
  },
  {
    title: 'Finance & Compliance',
    items: [
      {
        path: 'gst-and-tax-invoices',
        label: 'GST & Tax Invoices',
        icon: 'receipt_long',
        element: GstInvoiceManagement,
      },
      {
        path: 'payments-and-reconciliation',
        label: 'Payments',
        icon: 'account_balance_wallet',
        element: PaymentsAndReconciliation,
      },
      {
        path: 'credit-notes-and-refunds',
        label: 'Credit Notes & Refunds',
        icon: 'currency_exchange',
        element: CreditNotesAndRefunds,
      },
    ],
  },
  {
    title: 'Settings & Admin',
    items: [
      {
        path: 'customers-and-loyalty',
        label: 'Customers & Loyalty',
        icon: 'group',
        element: CustomersAndLoyalty,
        detail: [':customerId'],
      },
      {
        path: 'promotions-and-coupons',
        label: 'Promotions & Coupons',
        icon: 'sell',
        element: PromotionsAndCoupons,
      },
      {
        path: 'users-and-role-access',
        label: 'Users & Role Access',
        icon: 'admin_panel_settings',
        element: UsersAndRoleAccess,
      },
      { path: 'system-settings', label: 'System Settings', icon: 'settings', element: SystemSettings },
    ],
  },
];

/** Flat list of every module route, in sidebar order. */
export const MODULE_ROUTES = MENU_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.title }))
);

export const findModule = (path) => MODULE_ROUTES.find((m) => m.path === path) ?? null;
