import { retrieveCustomer } from "@lib/data/account"
import { listRegions } from "@lib/data/catalog"
import { AddressBook } from "@modules/account/address-book"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Saved Addresses | Everwear Atelier", robots: { index: false } }

export default async function AddressesPage() {
  const [customer, regions] = await Promise.all([retrieveCustomer(), listRegions()])
  if (!customer) return null
  const countries = regions.flatMap((r) => r.countries).sort((a, b) => a.name.localeCompare(b.name))

  return <AddressBook customer={customer} countries={countries} />
}
