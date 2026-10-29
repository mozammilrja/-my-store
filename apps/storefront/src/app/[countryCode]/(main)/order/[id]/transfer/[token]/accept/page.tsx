import { redirect } from "next/navigation"

/**
 * Old email links pointed here. Accepting or declining changes order
 * ownership, so it must never happen on a GET (link prefetchers and email
 * scanners follow links). Send the customer to the page that asks first.
 */
export default async function TransferShortcut({
  params,
}: {
  params: Promise<{ countryCode: string; id: string; token: string }>
}) {
  const { countryCode, id, token } = await params
  redirect(`/${countryCode}/order/${encodeURIComponent(id)}/transfer/${encodeURIComponent(token)}`)
}
