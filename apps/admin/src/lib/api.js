/**
 * Everwear Fashion Commerce Admin - API Client
 * Connects directly to the Everwear Commerce API (apps/backend on port 9100).
 */

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:9100' : 'https://api.everwear.com');
const TOKEN_KEY = 'everwear_admin_token';
const DEFAULT_EMAIL = 'admin@everwear.test';
const DEFAULT_PASSWORD = 'adminpassword123';

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

export const setToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Session in memory
  }
};

const onClearTokenListeners = new Set();

export const registerOnClearToken = (listener) => {
  if (typeof listener === 'function') {
    onClearTokenListeners.add(listener);
    return () => onClearTokenListeners.delete(listener);
  }
};

/**
 * Forgets the token without telling anyone.
 *
 * The 401 path uses this rather than `clearToken`. Notifying listeners there
 * empties the query cache out from under the very queries that are awaiting
 * this request: their cache entries vanish, the observers resubscribe to fresh
 * pending queries, and the rejection they were waiting for lands nowhere. The
 * screen then holds its skeletons forever instead of showing the error.
 */
const discardToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
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

/** Ensures an active admin authentication token exists, auto-signing in if needed in dev */
export async function ensureAdminAuth() {
  const existingToken = getToken();
  if (existingToken) return existingToken;

  // In production builds, do not attempt auto-login with default developer credentials
  if (import.meta.env.PROD) {
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.token) {
        setToken(data.token);
        return data.token;
      }
    }
  } catch (err) {
    console.warn('API auto-login unavailable:', err?.message);
  }
  return null;
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
  let token = getToken();
  if (!token && !path.includes('/auth/login')) {
    token = await ensureAdminAuth();
  }

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

  // Handle unauthorized by attempting one re-auth
  if (response.status === 401 && !path.includes('/auth/login')) {
    discardToken();
    token = await ensureAdminAuth();
    if (!token) {
      throw new ApiError(
        401,
        'session_expired',
        'Your admin session has expired. Sign in again to continue.'
      );
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      try {
        response = await fetch(`${API_URL}${path}${toSearch(query)}`, {
          method,
          headers,
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
      } catch (err) {
        throw new ApiError(503, 'unavailable', "Can't reach the API. Is the backend running?");
      }
    }
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

    const existing = getToken();
    if (existing) run(existing);
    else ensureAdminAuth().then(run).catch(() => run(null));
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
  shipments: () => api('/admin/shipments'),
  createShipment: (orderId, body = {}) => api(`/admin/orders/${orderId}/shipment`, { method: 'POST', body }),
  trackShipment: (orderId) => api(`/admin/orders/${orderId}/track`),
  returnAction: (orderId, body) => api(`/admin/orders/${orderId}/return-request`, { method: 'POST', body }),

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
