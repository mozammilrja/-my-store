import { Container } from "@/components/store/container"
import TransferActions from "@modules/order/components/transfer-actions"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Order transfer",
  robots: { index: false },
}

export default async function TransferPage({
  params,
}: {
  params: Promise<{ id: string; token: string }>
}) {
  const { id, token } = await params

  return (
    <Container className="flex max-w-2xl flex-col gap-6 py-16">
      <h1 className="font-display-tight text-5xl">Transfer request</h1>
      <p className="text-muted-foreground">
        Someone asked to take over order <span className="font-medium text-foreground">{id}</span>.
        If you accept, the new owner gets access to the order and its details.
      </p>
      <p className="text-muted-foreground">
        If you don&apos;t recognise this request, choose Decline or simply ignore it.
        Nothing changes until you choose.
      </p>
      <TransferActions id={id} token={token} />
    </Container>
  )
}
