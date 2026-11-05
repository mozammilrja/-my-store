import { api } from './api';

/*
 * Warehouse operations endpoints (apps/backend/src/routes/admin/warehouses.ts
 * and fulfilment.ts): buildings, their staff, stock and its ledger, and the
 * fulfilment board. Roles are enforced by the API; the screen only hides
 * what a role can never do.
 */
export const warehousesApi = {
  warehouses: () => api('/admin/warehouses'),
  createWarehouse: (body) => api('/admin/warehouses', { method: 'POST', body }),
  updateWarehouse: (id, body) => api(`/admin/warehouses/${id}`, { method: 'PATCH', body }),

  stockLevels: (query = {}) => api('/admin/stock-levels', { query }),
  stockLedger: (query = {}) => api('/admin/stock-ledger', { query }),
  stockOperation: (body) => api('/admin/stock-operations', { method: 'POST', body }),
  openingBalance: (body) => api('/admin/stock-levels/opening-balance', { method: 'POST', body }),
  findProducts: (q) => api('/admin/products', { query: { q, limit: 20 } }),

  users: () => api('/admin/warehouse-users'),
  createUser: (body) => api('/admin/warehouse-users', { method: 'POST', body }),
  updateUser: (id, body) => api(`/admin/warehouse-users/${id}`, { method: 'PATCH', body }),

  fulfilments: (query = {}) => api('/admin/fulfilments', { query }),
  fulfilment: (id) => api(`/admin/fulfilments/${id}`),
  reassign: (id, body) => api(`/admin/fulfilments/${id}/reassign`, { method: 'POST', body }),
};
