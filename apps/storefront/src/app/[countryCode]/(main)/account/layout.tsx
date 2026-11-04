import { Container } from "@/components/store/container"
import { retrieveCustomer } from "@lib/data/account"
import { AccountNav } from "@modules/account/account-nav"

/** Signed in: the Stitch account area with sidebar. Signed out: the sign-in page at the same URL. */
export default async function AccountLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    return (
      <div className="bg-background min-h-[calc(100vh-200px)] py-16 lg:py-24">
        <Container>{login}</Container>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      <Container className="py-8 lg:py-12 max-w-[1440px]">
        <div className="flex flex-col lg:flex-row items-start gap-gutter">
          <AccountNav customer={customer} />
          <div className="flex-1 w-full min-w-0">{dashboard}</div>
        </div>
      </Container>
    </div>
  )
}
