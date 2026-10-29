import { AuthForms } from "@modules/account/auth-forms"

/** Sub-pages like /account/orders show the sign-in form when signed out. */
export default function LoginDefault() {
  return <AuthForms />
}
