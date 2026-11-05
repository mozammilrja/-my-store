/**
 * Everwear Fashion Commerce Admin - API Client
 * Connects directly to the Everwear Commerce API (apps/backend on port 9100).
 */

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:9100' : 'https://api.everwear.com');
const TOKEN_KEY = 'everwear_admin_token';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * Listeners told whenever the stored token appears or disappears, so the
 * router can send a signed-out viewer to /login without polling storage.
 */
const tokenListeners = new Set();

export const onTokenChange = (listener) => {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
};

const notifyToken = (token) => {
  tokenListeners.forEach((listener) => {
    try {
      listener(token);
    } catch {
      // A listener's failure must not stop the others
    }
  });
};

export const setToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Session in memory
  }
  notifyToken(token);
};

const onClearTokenListeners = new Set();

export const registerOnClearToken = (listener) => {
  if (typeof listener === 'function') {
    onClearTokenListeners.add(listener);
    return () => onClearTokenListeners.delete(listener);
  }
};

/**
 * Forgets the token after the API refused it.
 *
 * This tells the router (so it can show the login) but deliberately does not
 * empty the query cache: doing that out from under the queries still awaiting
 * this request would strand them on skeletons instead of letting them fail.
 */
const discardToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
  notifyToken(null);
};

/** Signs the admin out: forgets the token and lets listeners drop cached data. */
export const clearToken = () => {
  discardToken();
  onClearTokenListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors during teardown
    }
  });
};

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
  const isLogin = path.includes('/auth/login');
  const token = isLogin ? null : getToken();

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}${toSearch(query)}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    throw new ApiError(503, 'unavailable', `Can't reach the API at ${API_URL}. Is the backend running?`);
  }

  // A refused token is gone for good: forget it, which sends the viewer to the
  // login. Only forget it if it is still the stored one, so a request that was
  // sent before a fresh sign-in cannot sign the new session out.
  if (response.status === 401 && !isLogin) {
    if (token && getToken() === token) discardToken();
    throw new ApiError(401, 'session_expired', 'Your admin session has expired. Sign in again to continue.');
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

    const run = (token) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/admin/uploads`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
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
        if (xhr.status === 401 && token && getToken() === token) discardToken();
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

    run(getToken());
  });
}

export const adminApi = {
  // Auth
  login: (email, password) =>
    api('/admin/auth/login', { method: 'POST', body: { email, password } }),
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
