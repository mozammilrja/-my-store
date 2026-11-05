import { api } from './api';

/*
 * Marketplace endpoints (apps/backend/src/routes/admin/marketplace.ts):
 * seller review, listing review, settlements and marketplace settings.
 */

import { API_URL } from '../portal/client';

/** Product images are stored as `/uploads/...` paths on the API host. */
export const assetSrc = (path) => (!path ? '' : /^https?:\/\//.test(path) ? path : `${API_URL}${path}`);

export const marketplaceApi = {
  settings: () => api('/admin/marketplace/settings'),
  updateSettings: (body) => api('/admin/marketplace/settings', { method: 'PATCH', body }),

  sellers: (status) => api('/admin/sellers', { query: status ? { status } : undefined }),
  seller: (id) => api(`/admin/sellers/${id}`),
  /** The full account number. Audited on the server; never cache it. */
  sellerBank: (id) => api(`/admin/sellers/${id}/bank`),
  verify: (id, item) => api(`/admin/sellers/${id}/verify/${item}`, { method: 'POST', body: {} }),
  approve: (id, body) => api(`/admin/sellers/${id}/approve`, { method: 'POST', body }),
  setStatus: (id, action, reason) => api(`/admin/sellers/${id}/${action}`, { method: 'POST', body: { reason } }),
  performance: (id, from) => api(`/admin/sellers/${id}/performance`, { query: from ? { from } : undefined }),

  reviewQueue: () => api('/admin/listings/review'),
  reviewListing: (id, decision, note) => api(`/admin/listings/${id}/${decision}`, { method: 'POST', body: note ? { note } : {} }),

  settlements: (status) => api('/admin/settlements', { query: status ? { status } : undefined }),
  runSettlements: () => api('/admin/settlements/run', { method: 'POST', body: {} }),
  markPaid: (id, utr) => api(`/admin/settlements/${id}/paid`, { method: 'POST', body: { utr } }),
};
