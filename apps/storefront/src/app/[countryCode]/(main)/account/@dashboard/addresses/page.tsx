import { retrieveCustomer } from "@lib/data/account"
import { listRegions } from "@lib/data/catalog"
import { AddressBook } from "@modules/account/address-book"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Addresses", robots: { index: false } }

export default async function AddressesPage() {
  const [customer, regions] = await Promise.all([retrieveCustomer(), listRegions()])
  if (!customer) notFound()
  const countries = regions.flatMap((r) => r.countries).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display-tight text-6xl">Addresses</h1>
      <AddressBook customer={customer} countries={countries} />
    </div>
  )
}
