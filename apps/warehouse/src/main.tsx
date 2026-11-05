import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router"
import { FeedbackProvider } from "./components/feedback"
import { Layout } from "./components/layout"
import { Spinner } from "./components/ui"
import { ApiError } from "./lib/api"
import { SessionProvider, useToken } from "./lib/session"
import { Dashboard } from "./routes/dashboard"
import { Dispatch } from "./routes/dispatch"
import { FulfilmentWork } from "./routes/fulfilment"
import { Login } from "./routes/login"
import { Returns } from "./routes/returns"
import { Stock } from "./routes/stock"
import "./styles.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A refusal (4xx) won't change on retry; a dropped connection might.
      retry: (count, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
  },
})

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/fulfilments/:id", element: <FulfilmentWork /> },
      { path: "/dispatch", element: <Dispatch /> },
      { path: "/stock", element: <Stock /> },
      { path: "/returns", element: <Returns /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
])

function App() {
  const token = useToken()
  if (!token) return <Login />
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
