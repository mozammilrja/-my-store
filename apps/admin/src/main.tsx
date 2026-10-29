import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AppShell } from "@/components/app-shell"
import { RequireAuth } from "@/components/require-auth"
import { Toaster } from "@/components/ui/sonner"
import { MODULE_PLANS } from "@/lib/modules"
import { TooltipProvider } from "@/components/ui/tooltip"
import CatalogPage from "@/routes/catalog"
import CustomerDetailPage from "@/routes/customer-detail"
import CustomersPage from "@/routes/customers"
import DashboardPage from "@/routes/dashboard"
import LoginPage from "@/routes/login"
import OrderDetailPage from "@/routes/order-detail"
import OrdersPage from "@/routes/orders"
import ProductDetailPage from "@/routes/product-detail"
import { ModulePlaceholder } from "@/routes/module-placeholder"
import ProductsPage from "@/routes/products"
import SettingsPage from "@/routes/settings"
import UsersPage from "@/routes/users"
import PromotionsPage from "@/routes/promotions"
import "@fontsource-variable/inter"
import "@/styles/globals.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
})

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "orders", element: <OrdersPage /> },
          { path: "orders/:id", element: <OrderDetailPage /> },
          { path: "products", element: <ProductsPage /> },
          { path: "products/:id", element: <ProductDetailPage /> },
          { path: "customers", element: <CustomersPage /> },
          { path: "customers/:id", element: <CustomerDetailPage /> },
          { path: "catalog", element: <CatalogPage /> },
          { path: "promotions", element: <PromotionsPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "settings", element: <SettingsPage /> },
          ...Object.entries(MODULE_PLANS).map(([path, plan]) => ({
            path,
            element: <ModulePlaceholder plan={plan} />,
          })),
        ],
      },
    ],
  },
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>
)
