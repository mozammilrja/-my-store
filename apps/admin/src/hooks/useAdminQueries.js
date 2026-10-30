import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { QUERY_KEYS } from '../lib/queryClient';

// ==========================================
// 1. Executive Overview & Dashboard Hooks
// ==========================================
export function useDashboardQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => adminApi.dashboard(),
    ...options,
  });
}

// ==========================================
// 2. Order Management Hooks
// ==========================================
export function useOrdersQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.orders(params),
    queryFn: () => adminApi.orders(params),
    ...options,
  });
}

export function useOrderQuery(id, options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.order(id),
    queryFn: () => adminApi.order(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args) => {
      const orderId = args?.id ?? args?.orderId;
      const statusData = args?.statusData ?? args?.status ?? args?.body;
      return adminApi.setOrderStatus(orderId, statusData);
    },
    onSuccess: (_, args) => {
      const orderId = args?.id ?? args?.orderId;
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.order(orderId) });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipments });
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.cancelOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.order(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
    },
  });
}

// ==========================================
// 3. Product Catalog Hooks
// ==========================================
export function useProductsQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.products(params),
    queryFn: () => adminApi.products(params),
    ...options,
  });
}

export function useProductQuery(id, options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.product(id),
    queryFn: () => adminApi.product(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.createProduct(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args) => {
      const productId = args?.id ?? args?.productId;
      const data = args?.data ?? args?.body;
      return adminApi.updateProduct(productId, data);
    },
    onSuccess: (_, args) => {
      const productId = args?.id ?? args?.productId;
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      if (productId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(productId) });
      }
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });
}

// ==========================================
// 4. Categories & Collections Hooks
// ==========================================
export function useCategoriesQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: () => adminApi.categories(),
    ...options,
  });
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });
}

export function useCollectionsQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.collections,
    queryFn: () => adminApi.collections(),
    ...options,
  });
}

export function useCreateCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.createCollection(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.collections });
    },
  });
}

export function useDeleteCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.collections });
    },
  });
}

// ==========================================
// 5. Customer & Clienteling Hooks
// ==========================================
export function useCustomersQuery(params = {}, options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.customers(params),
    queryFn: () => adminApi.customers(params),
    ...options,
  });
}

export function useCustomerQuery(id, options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.customer(id),
    queryFn: () => adminApi.customer(id),
    enabled: Boolean(id),
    ...options,
  });
}

// ==========================================
// 6. Inventory & Warehouse Management Hooks
// ==========================================
export function useInventoryQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.inventory,
    queryFn: () => adminApi.inventory(),
    ...options,
  });
}

export function useAdjustInventoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.adjustInventory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });
}

// ==========================================
// 7. Shipments & Dispatch Hooks
// ==========================================
export function useShipmentsQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.shipments,
    queryFn: () => adminApi.shipments(),
    ...options,
  });
}

export function useCreateShipmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args) => {
      const orderId = args?.orderId ?? args?.id;
      const body = args?.body ?? {};
      return adminApi.createShipment(orderId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shipments });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}

export function useProcessReturnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args) => {
      const orderId = args?.orderId ?? args?.id;
      const reason = args?.reason ?? 'Return inspection passed & approved';
      const action = args?.action ?? 'refund';
      return adminApi.returnAction(orderId, { reason, action });
    },
    onSuccess: (_, args) => {
      const orderId = args?.orderId ?? args?.id;
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.order(orderId) });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.creditNotes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
    },
  });
}

// ==========================================
// 8. Finance, GST Invoices & Credit Notes
// ==========================================
export function useInvoicesQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.invoices,
    queryFn: () => adminApi.invoices(),
    ...options,
  });
}

export function useCreditNotesQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.creditNotes,
    queryFn: () => adminApi.creditNotes(),
    ...options,
  });
}

// ==========================================
// 9. Procurement & Suppliers Hooks
// ==========================================
export function useSuppliersQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.suppliers,
    queryFn: () => adminApi.suppliers(),
    ...options,
  });
}

export function useCreateSupplierMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.createSupplier(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
    },
  });
}

export function usePurchaseOrdersQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.purchaseOrders,
    queryFn: () => adminApi.purchaseOrders(),
    ...options,
  });
}

export function useCreatePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.createPurchaseOrder(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.purchaseOrders });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
    },
  });
}

// ==========================================
// 10. Promotions & Coupons Hooks
// ==========================================
export function usePromotionsQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.promotions,
    queryFn: () => adminApi.promotions(),
    ...options,
  });
}

export function useCreatePromotionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.createPromotion(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.promotions });
    },
  });
}

export function useTogglePromotionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args) => {
      const promoId = args?.id ?? args?.promoId;
      return adminApi.setPromotionActive(promoId, args?.active);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.promotions });
    },
  });
}

export function useDeletePromotionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.promotions });
    },
  });
}

// ==========================================
// 11. Users & RBAC Hooks
// ==========================================
export function useUsersQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: () => adminApi.users(),
    ...options,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.createUser(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args) => {
      const userId = args?.id ?? args?.userId;
      const body = args?.body ?? args?.data;
      return adminApi.updateUser(userId, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

// ==========================================
// 12. System Settings Hooks
// ==========================================
export function useSettingsQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.settings,
    queryFn: () => adminApi.settings(),
    ...options,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => adminApi.updateSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });
}
