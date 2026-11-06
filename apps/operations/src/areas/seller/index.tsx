import { Navigate, Route, Routes } from "react-router"
import { Spinner } from "@/areas/shared/ui"
import { AreaShell, makeAreaClient } from "@/areas/shared/AreaShell"
import { AccountContent } from "@/portal/AccountPage"
import { usePortal } from "@/portal/session"
import { Layout } from "./components/layout"
import { SessionProvider } from "./lib/session"
import { AuthScreen } from "./routes/auth"
import { ListingEditor, Listings } from "./routes/listings"
import { Payments, Reports } from "./routes/money"
import { OrderDetail, Orders } from "./routes/orders"
import { Overview } from "./routes/overview"
import { Returns, Sales } from "./routes/sales-returns"
import { Stock } from "./routes/stock"

const client = makeAreaClient()

/** /seller/*: the Seller Hub (was apps/seller). The portal has checked the session holds a seller account. */
export default function SellerArea() {
  const { principal } = usePortal()
  return (
    <AreaShell client={client}>
      <SessionProvider key={principal?.session.id} fallback={<Spinner label="Signing in" />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="listings" element={<Listings />} />
            <Route path="listings/:id" element={<ListingEditor />} />
            <Route path="stock" element={<Stock />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="sales" element={<Sales />} />
            <Route path="returns" element={<Returns />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="account" element={<AccountContent />} />
            <Route path="*" element={<Navigate to="/seller" replace />} />
          </Route>
        </Routes>
      </SessionProvider>
    </AreaShell>
  )
}

/** /seller/register: open to anyone, like the Seller Hub's sign-up was. */
export function SellerRegister() {
  return (
    <AreaShell client={client}>
      <AuthScreen />
    </AreaShell>
  )
}
