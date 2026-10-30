import { retrieveCustomer } from "@lib/data/account"
import { ProfileForm } from "@modules/account/profile-form"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = { title: "Profile", robots: { index: false } }

export default async function ProfilePage() {
  const customer = await retrieveCustomer()
  if (!customer) notFound()
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display-hero text-4xl sm:text-5xl font-light tracking-tight">Profile</h1>
      <ProfileForm customer={customer} />
    </div>
  )
}
