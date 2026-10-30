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

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
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
    clearToken();
    token = await ensureAdminAuth();
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

export async function uploadImage(file) {
  const form = new FormData();
  form.append('file', file);
  let token = getToken() || (await ensureAdminAuth());

  let response;
  try {
    response = await fetch(`${API_URL}/admin/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch {
    throw new ApiError(503, 'unavailable', "Can't reach the API for image upload.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error?.code ?? 'error',
      data?.error?.message ?? 'Product image could not be uploaded'
    );
  }

  return { path: data?.path, url: data?.url };
}

export const adminApi = {
  // Auth
  login: (email, password) =>
    api('/admin/auth/login', { method: 'POST', body: { email, password } }),
  me: () => api('/admin/me'),

  // Dashboard Overview
  dashboard: () => api('/admin/dashboard'),

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

  // Regions & Store
  regions: () => api('/admin/regions'),
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
