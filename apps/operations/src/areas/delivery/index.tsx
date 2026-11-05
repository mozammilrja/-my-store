import { Navigate, Route, Routes } from "react-router"
import { Spinner } from "@/areas/shared/ui"
import { AreaShell, makeAreaClient } from "@/areas/shared/AreaShell"
import { usePortal } from "@/portal/session"
import { Layout } from "./components/layout"
import { SessionProvider } from "./lib/session"
import { AuthScreen } from "./routes/auth"
import { CashScreen, EarningsScreen } from "./routes/money"
import { Profile } from "./routes/profile"
import { TaskScreen } from "./routes/task"
import { Today } from "./routes/today"

const client = makeAreaClient({ refetchOnWindowFocus: true })

/** /delivery/*: the own-fleet rider app (was apps/rider). The portal has checked the session holds a rider account. */
export default function DeliveryArea() {
  const { principal } = usePortal()
  return (
    <AreaShell client={client}>
      <SessionProvider key={principal?.session.id} fallback={<Spinner label="Signing in" />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="tasks/:id" element={<TaskScreen />} />
            <Route path="cash" element={<CashScreen />} />
            <Route path="earnings" element={<EarningsScreen />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/delivery" replace />} />
          </Route>
        </Routes>
      </SessionProvider>
    </AreaShell>
  )
}

/** /delivery/register: open to anyone, like the rider app's sign-up was. */
export function DeliveryRegister() {
  return (
    <AreaShell client={client}>
      <AuthScreen />
    </AreaShell>
  )
}
