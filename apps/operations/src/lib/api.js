/**
 * Everwear Fashion Commerce Admin - API Client
 * Connects directly to the Everwear Commerce API (apps/backend on port 9100).
 */

import { API_URL as PORTAL_API_URL, PORTAL_HEADER, portalFetch } from '../portal/client';

/**
 * The admin's API calls ride on the operations portal session (an httpOnly
 * cookie, see src/portal/client.ts). There is no token here any more: the
 * portal signs in and out, and a 401 tells it the session ended.
 */
export const API_URL = PORTAL_API_URL;

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const toSearch = (query) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : '';
};

export async function api(path, options = {}) {
  const { method = 'GET', body, query } = options;

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await portalFetch(`${path}${toSearch(query)}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    throw new ApiError(503, 'unavailable', `Can't reach the API at ${API_URL}. Is the backend running?`);
  }

  // The portal hears about the 401 from portalFetch and sends the viewer to sign in.
  if (response.status === 401) {
    throw new ApiError(401, 'session_expired', 'Your session has expired. Sign in again to continue.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error?.code ?? 'error',
      data?.error?.message ?? 'API request failed'
    );
  }

  return data;
}

/** What the API accepts, mirrored here so a bad file is caught before the round trip. */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function describeUploadProblem(file) {
  if (!file) return 'Choose an image to upload.';
  if (!UPLOAD_TYPES.includes(file.type)) {
    return `${file.type || 'That file type'} is not supported. Use PNG, JPEG or WebP.`;
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`;
  }
  return null;
}

/**
 * Uploads one image and reports real progress.
 *
 * `fetch` cannot report upload progress, so this goes through XMLHttpRequest
 * and forwards `upload.onprogress`. When the browser cannot compute a ratio
 * the callback receives `null`, which the caller shows as indeterminate
 * rather than inventing a percentage.
 */
export function uploadImage(file, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const problem = describeUploadProblem(file);
    if (problem) {
      reject(new ApiError(400, 'invalid_file', problem));
      return;
    }

    const run = () => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/admin/uploads`);
      // The session cookie goes with the upload, and the header the API requires with it.
      xhr.withCredentials = true;
      xhr.setRequestHeader(PORTAL_HEADER, '1');
      xhr.responseType = 'json';

      xhr.upload.onprogress = (event) => {
        if (!onProgress) return;
        onProgress(event.lengthComputable ? Math.round((event.loaded / event.total) * 100) : null);
      };

      xhr.onload = () => {
        const data = xhr.response;
        if (xhr.status >= 200 && xhr.status < 300 && data?.path) {
          onProgress?.(100);
          resolve({ path: data.path, url: data.url });
          return;
        }
        reject(
          new ApiError(
            xhr.status,
            data?.error?.code ?? 'error',
            data?.error?.message ?? 'The image could not be uploaded.'
          )
        );
      };
      xhr.onerror = () => reject(new ApiError(503, 'unavailable', "Can't reach the API to upload this image."));
      xhr.onabort = () => reject(new ApiError(499, 'aborted', 'Upload cancelled.'));
      if (signal) signal.addEventListener('abort', () => xhr.abort(), { once: true });

      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    };

    run();
  });
}

export const adminApi = {
  // The signed-in admin (sign-in itself is the portal's: /ops/auth/login)
  me: () => api('/admin/me'),

  // Dashboard Overview
  dashboard: () => api('/admin/dashboard'),
  analytics: (query) => api('/admin/analytics', { query }),

  // Orders
  orders: (params = {}) => api('/admin/orders', { query: params }),
  order: (id) => api(`/admin/orders/${id}`),
  setOrderStatus: (id, body) => api(`/admin/orders/${id}/status`, { method: 'POST', body }),
  cancelOrder: (id) => api(`/admin/orders/${id}/cancel`, { method: 'POST' }),

  // Products
  products: (params = {}) => api('/admin/products', { query: params }),
  product: (id) => api(`/admin/products/${id}`),
  createProduct: (body) => api('/admin/products', { method: 'POST', body }),
  updateProduct: (id, body) => api(`/admin/products/${id}`, { method: 'PATCH', body }),
  deleteProduct: (id) => api(`/admin/products/${id}`, { method: 'DELETE' }),
  uploadImage,

  // Site media (storefront banners and editorial images)
  siteMedia: () => api('/admin/site-media'),
  updateSiteMedia: (key, body) => api(`/admin/site-media/${encodeURIComponent(key)}`, { method: 'PATCH', body }),
  resetSiteMedia: (key) => api(`/admin/site-media/${encodeURIComponent(key)}/reset`, { method: 'POST' }),

  // Customers
  customers: (params = {}) => api('/admin/customers', { query: params }),
  customer: (id) => api(`/admin/customers/${id}`),

  // Store
  categories: () => api('/admin/categories'),
  createCategory: (body) => api('/admin/categories', { method: 'POST', body }),
  updateCategory: (id, body) => api(`/admin/categories/${id}`, { method: 'PATCH', body }),
  deleteCategory: (id) => api(`/admin/categories/${id}`, { method: 'DELETE' }),

  collections: () => api('/admin/collections'),
  createCollection: (body) => api('/admin/collections', { method: 'POST', body }),
  updateCollection: (id, body) => api(`/admin/collections/${id}`, { method: 'PATCH', body }),
  deleteCollection: (id) => api(`/admin/collections/${id}`, { method: 'DELETE' }),

  promotions: () => api('/admin/promotions'),
  createPromotion: (body) => api('/admin/promotions', { method: 'POST', body }),
  setPromotionActive: (id, active) => api(`/admin/promotions/${id}`, { method: 'PATCH', body: { active } }),
  deletePromotion: (id) => api(`/admin/promotions/${id}`, { method: 'DELETE' }),

  // Users & Roles
  users: () => api('/admin/users'),
  createUser: (body) => api('/admin/users', { method: 'POST', body }),
  updateUser: (id, body) => api(`/admin/users/${id}`, { method: 'PATCH', body }),
  deleteUser: (id) => api(`/admin/users/${id}`, { method: 'DELETE' }),

  // Settings
  settings: () => api('/admin/settings'),
  updateSettings: (body) => api('/admin/settings', { method: 'PATCH', body }),

  // Shipments & Logistics
  shipments: (params = {}) => api('/admin/shipments', { query: params }),
  shipment: (id) => api(`/admin/shipments/${id}`),
  orderCouriers: (orderId) => api(`/admin/orders/${orderId}/couriers`),
  /** Books with the courier integration, or `{ manual: { carrier, awb, trackingUrl? } }` for one booked elsewhere. */
  createShipment: (orderId, body = {}) => api(`/admin/orders/${orderId}/shipments`, { method: 'POST', body }),
  assignCourier: (id, courierId) => api(`/admin/shipments/${id}/assign-courier`, { method: 'POST', body: courierId ? { courierId } : {} }),
  shipmentLabel: (id) => api(`/admin/shipments/${id}/label`, { method: 'POST' }),
  shipmentPickup: (id) => api(`/admin/shipments/${id}/pickup`, { method: 'POST' }),
  syncShipment: (id) => api(`/admin/shipments/${id}/sync`, { method: 'POST' }),
  cancelShipment: (id) => api(`/admin/shipments/${id}/cancel`, { method: 'POST' }),
  ndrAction: (id, body) => api(`/admin/shipments/${id}/ndr`, { method: 'POST', body }),
  manualShipmentStatus: (id, body) => api(`/admin/shipments/${id}/status`, { method: 'POST', body }),

  // Payments, refunds & integrations
  integrations: () => api('/admin/integrations'),
  paymentAttempts: (params = {}) => api('/admin/payment-attempts', { query: params }),
  refunds: () => api('/admin/refunds'),
  orderPayments: (orderId) => api(`/admin/orders/${orderId}/payments`),
  refundOrder: (orderId, body) => api(`/admin/orders/${orderId}/refunds`, { method: 'POST', body }),
  webhookEvents: (params = {}) => api('/admin/webhook-events', { query: params }),
  reconcile: () => api('/admin/reconcile', { method: 'POST' }),
  returnAction: (orderId, body) => api(`/admin/orders/${orderId}/return-request`, { method: 'POST', body }),
  returns: (params = {}) => api('/admin/returns', { query: params }),
  returnDetail: (id) => api(`/admin/returns/${id}`),
  returnAct: (id, action, body = {}) => api(`/admin/returns/${id}/${action}`, { method: 'POST', body }),
  returnOptions: (orderNumber) => api('/admin/return-options', { query: { orderNumber } }),
  createReturn: (orderId, body) => api(`/admin/orders/${orderId}/returns`, { method: 'POST', body }),

  // Invoices & Credit Notes (GST & Tax)
  invoices: () => api('/admin/invoices'),
  creditNotes: () => api('/admin/credit-notes'),

  // Procurement & Suppliers
  suppliers: () => api('/admin/suppliers'),
  createSupplier: (body) => api('/admin/suppliers', { method: 'POST', body }),
  purchaseOrders: () => api('/admin/purchase-orders'),
  createPurchaseOrder: (body) => api('/admin/purchase-orders', { method: 'POST', body }),

  // Inventory & Warehouse Telemetry
  inventory: () => api('/admin/inventory'),
  adjustInventory: (body) => api('/admin/inventory/adjust', { method: 'POST', body }),
};
