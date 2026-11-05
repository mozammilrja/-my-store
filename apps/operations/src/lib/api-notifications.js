import { api } from './api';

/** Outbound notifications (apps/backend/src/routes/admin/notifications.ts). Retries and templates are owner-only. */
export const notificationsApi = {
  status: () => api('/admin/notifications/status'),
  deliveries: (query = {}) => api('/admin/notifications/deliveries', { query }),
  retryDelivery: (id) => api(`/admin/notifications/deliveries/${id}/retry`, { method: 'POST' }),
  templates: () => api('/admin/notifications/templates'),
  saveTemplates: (event, body) => api(`/admin/notifications/templates/${event}`, { method: 'PUT', body }),
  outbox: (status = 'failed') => api('/admin/outbox', { query: { status } }),
  retryOutbox: (id) => api(`/admin/outbox/${id}/retry`, { method: 'POST' }),
};
