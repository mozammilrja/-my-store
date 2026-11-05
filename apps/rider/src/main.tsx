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
import { CashScreen, EarningsScreen } from "./routes/money"
import { Profile } from "./routes/profile"
import { TaskScreen } from "./routes/task"
import { Today } from "./routes/today"
import "./styles.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
  },
})

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Today /> },
      { path: "/tasks/:id", element: <TaskScreen /> },
      { path: "/cash", element: <CashScreen /> },
      { path: "/earnings", element: <EarningsScreen /> },
      { path: "/profile", element: <Profile /> },
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
