import { Navigate, Route, Routes } from "react-router"
import { Spinner } from "@/areas/shared/ui"
import { AreaShell, makeAreaClient } from "@/areas/shared/AreaShell"
import { usePortal } from "@/portal/session"
import { Layout } from "./components/layout"
import { SessionProvider } from "./lib/session"
import { Dashboard } from "./routes/dashboard"
import { Dispatch } from "./routes/dispatch"
import { FulfilmentWork } from "./routes/fulfilment"
import { Returns } from "./routes/returns"
import { Stock } from "./routes/stock"

const client = makeAreaClient({ refetchOnWindowFocus: true })

/** /warehouse/*: the floor (was apps/warehouse). The portal has checked the session holds a warehouse account. */
export default function WarehouseArea() {
  const { principal } = usePortal()
  return (
    <AreaShell client={client}>
      <SessionProvider key={principal?.session.id} fallback={<Spinner label="Signing in" />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="fulfilments/:id" element={<FulfilmentWork />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="stock" element={<Stock />} />
            <Route path="returns" element={<Returns />} />
            <Route path="*" element={<Navigate to="/warehouse" replace />} />
          </Route>
        </Routes>
      </SessionProvider>
    </AreaShell>
  )
}
