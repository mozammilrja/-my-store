import { api, ApiError, getToken } from './api';

/*
 * Own delivery fleet and cash on delivery (apps/backend/src/routes/admin/fleet.ts).
 * Money is in paise throughout.
 */

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:9100' : 'https://api.everwear.com');

export const fleetApi = {
  settings: () => api('/admin/fleet/settings'),
  updateSettings: (body) => api('/admin/fleet/settings', { method: 'PATCH', body }),

  zones: () => api('/admin/delivery-zones'),
  createZone: (body) => api('/admin/delivery-zones', { method: 'POST', body }),
  updateZone: (id, body) => api(`/admin/delivery-zones/${id}`, { method: 'PATCH', body }),

  warehouses: () => api('/admin/warehouses'),

  riders: (query) => api('/admin/riders', { query }),
  rider: (id) => api(`/admin/riders/${id}`),
  setRiderStatus: (id, status, reason) => api(`/admin/riders/${id}/status`, { method: 'POST', body: { status, reason } }),
  verifyDocument: (id, type) => api(`/admin/riders/${id}/documents/${type}/verify`, { method: 'POST', body: {} }),
  assignRider: (id, warehouseId, zoneIds) => api(`/admin/riders/${id}/assignment`, { method: 'PATCH', body: { warehouseId, zoneIds } }),

  tasks: (query) => api('/admin/delivery-tasks', { query }),
  task: (id) => api(`/admin/delivery-tasks/${id}`),
  assignTask: (id, riderId, reason) => api(`/admin/delivery-tasks/${id}/assign`, { method: 'POST', body: { riderId, reason } }),
  unassignTask: (id, reason) => api(`/admin/delivery-tasks/${id}/unassign`, { method: 'POST', body: { reason } }),
  offerTask: (id) => api(`/admin/delivery-tasks/${id}/offer`, { method: 'POST', body: {} }),
  rtoTask: (id, reason) => api(`/admin/delivery-tasks/${id}/rto`, { method: 'POST', body: { reason } }),
  /** The proof-of-delivery photo is private: fetched with the admin token and shown from an object URL. */
  async podPhoto(id) {
    const res = await fetch(`${API_URL}/admin/delivery-tasks/${id}/pod-photo`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Photo could not be loaded');
    }
    return URL.createObjectURL(await res.blob());
  },

  remittances: (query) => api('/admin/cod-remittances', { query }),
  reconcile: (id, counted, note) => api(`/admin/cod-remittances/${id}/reconcile`, { method: 'POST', body: { counted, ...(note ? { note } : {}) } }),
};
