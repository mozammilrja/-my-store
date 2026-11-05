import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router"
import { FeedbackProvider } from "./components/feedback"
import { Layout } from "./components/layout"
import { Spinner } from "./components/ui"
import { ApiError } from "./lib/api"
import { SessionProvider, useToken } from "./lib/session"
import { AuthScreen } from "./routes/auth"
import { ListingEditor, Listings } from "./routes/listings"
import { Payments, Reports } from "./routes/money"
import { OrderDetail, Orders } from "./routes/orders"
import { Overview } from "./routes/overview"
import { Returns, Sales } from "./routes/sales-returns"
import { Stock } from "./routes/stock"
import "./styles.css"

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (count, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 2 } },
})

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Overview /> },
      { path: "/listings", element: <Listings /> },
      { path: "/listings/:id", element: <ListingEditor /> },
      { path: "/stock", element: <Stock /> },
      { path: "/orders", element: <Orders /> },
      { path: "/orders/:id", element: <OrderDetail /> },
      { path: "/sales", element: <Sales /> },
      { path: "/returns", element: <Returns /> },
      { path: "/payments", element: <Payments /> },
      { path: "/reports", element: <Reports /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
])

function App() {
  const token = useToken()
  if (!token) return <AuthScreen />
  return (
    <SessionProvider key={token} fallback={<Spinner label="Signing in" />}>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </QueryClientProvider>
  </StrictMode>
)
