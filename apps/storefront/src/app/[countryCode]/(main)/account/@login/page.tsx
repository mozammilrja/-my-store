import { AuthForms } from "@modules/account/auth-forms"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Sign in", robots: { index: false } }

export default function LoginPage() {
  return <AuthForms />
}
