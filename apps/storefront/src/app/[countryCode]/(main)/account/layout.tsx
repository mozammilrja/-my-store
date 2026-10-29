import { Container } from "@/components/store/container"
import { retrieveCustomer } from "@lib/data/account"
import { AccountNav } from "@modules/account/account-nav"

/** Signed in: the account area. Signed out: the sign-in page at the same URL. */
export default async function AccountLayout({ dashboard, login }: { dashboard?: React.ReactNode; login?: React.ReactNode }) {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    return <Container className="py-16 lg:py-24">{login}</Container>
  }

  return (
    <Container className="grid gap-8 py-12 lg:grid-cols-[14rem_1fr] lg:gap-14 lg:py-16">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">Account</p>
          <p className="mt-1 truncate text-sm" data-testid="customer-email">{customer.email}</p>
        </div>
        <AccountNav />
      </div>
      <div className="min-w-0">{dashboard}</div>
    </Container>
  )
}
