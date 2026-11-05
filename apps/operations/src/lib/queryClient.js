import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query Client for the Everwear Admin SPA.
 * Configured with resilient production defaults preventing redundant refetches.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes fresh state
      gcTime: 1000 * 60 * 10,   // 10 minutes cache garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Signing in or out empties this cache (src/portal/session.tsx), all but the session record itself.

/**
 * Centrally registered query keys for cache consistency and targeted invalidations.
 */
export const QUERY_KEYS = {
  // Overview / Analytics
  dashboard: ['admin', 'dashboard'],
  analytics: (params) => ['admin', 'analytics', params ?? {}],

  // Orders
  orders: (params) => ['admin', 'orders', params ?? {}],
  order: (id) => ['admin', 'order', id],

  // Products
  products: (params) => ['admin', 'products', params ?? {}],
  product: (id) => ['admin', 'product', id],

  // Catalog
  categories: ['admin', 'categories'],
  collections: ['admin', 'collections'],

  // Customers
  customers: (params) => ['admin', 'customers', params ?? {}],
  customer: (id) => ['admin', 'customer', id],

  // Inventory & Fulfillment
  inventory: ['admin', 'inventory'],
  shipments: ['admin', 'shipments'],
  returns: (params) => ['admin', 'returns', params ?? {}],

  // Procurement
  suppliers: ['admin', 'suppliers'],
  purchaseOrders: ['admin', 'purchase-orders'],

  // Finance & Tax
  invoices: ['admin', 'invoices'],
  creditNotes: ['admin', 'credit-notes'],
  payments: ['admin', 'payments'],

  // Promotions & RBAC
  promotions: ['admin', 'promotions'],
  users: ['admin', 'users'],

  // System Settings
  settings: ['admin', 'settings'],
};
