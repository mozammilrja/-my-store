"use client"

import { Button } from "@/components/ui/button"
import { login, signup } from "@lib/data/account"
import Input from "@modules/common/components/input"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"

function ErrorText({ message, testId }: { message: string | null; testId: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-destructive-foreground" data-testid={testId}>
      {message}
    </p>
  )
}

/** Sign in and create-account forms; a successful submit refreshes into the account. */
export function AuthForms() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const router = useRouter()
  const [loginState, loginAction, loggingIn] = useActionState(login, { error: null })
  const [signupState, signupAction, signingUp] = useActionState(signup, { error: null })
  const [submitted, setSubmitted] = useState(false)

  // Server actions set the session cookie; re-render the page to show the account.
  useEffect(() => {
    if (submitted && !loggingIn && !signingUp && !loginState.error && !signupState.error) router.refresh()
  }, [submitted, loggingIn, signingUp, loginState.error, signupState.error, router])

  if (mode === "register") {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6" data-testid="register-page">
        <div className="flex flex-col gap-2">
          <h1 className="font-display-tight text-5xl">Create account</h1>
          <p className="text-sm text-muted-foreground">Track orders and check out faster.</p>
        </div>
        <form action={signupAction} onSubmit={() => setSubmitted(true)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" name="firstName" autoComplete="given-name" required data-testid="first-name-input" />
            <Input label="Last name" name="lastName" autoComplete="family-name" required data-testid="last-name-input" />
          </div>
          <Input label="Email" name="email" type="email" autoComplete="email" required data-testid="email-input" />
          <Input label="Phone (optional)" name="phone" type="tel" autoComplete="tel" data-testid="phone-input" />
          <Input label="Password (8+ characters)" name="password" type="password" autoComplete="new-password" minLength={8} required data-testid="password-input" />
          <ErrorText message={signupState.error} testId="register-error" />
          <Button type="submit" size="lg" disabled={signingUp} data-testid="register-button">
            {signingUp ? "Creating account" : "Create account"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <button type="button" onClick={() => setMode("login")} className="font-semibold text-foreground underline underline-offset-4">
            Sign in
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6" data-testid="login-page">
      <div className="flex flex-col gap-2">
        <h1 className="font-display-tight text-5xl">Sign in</h1>
        <p className="text-sm text-muted-foreground">See your orders and saved addresses.</p>
      </div>
      <form action={loginAction} onSubmit={() => setSubmitted(true)} className="flex flex-col gap-4">
        <Input label="Email" name="email" type="email" autoComplete="email" required data-testid="email-input" />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required data-testid="password-input" />
        <ErrorText message={loginState.error} testId="login-error-message" />
        <Button type="submit" size="lg" disabled={loggingIn} data-testid="sign-in-button">
          {loggingIn ? "Signing in" : "Sign in"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        New to Everwear?{" "}
        <button type="button" onClick={() => setMode("register")} className="font-semibold text-foreground underline underline-offset-4" data-testid="register-switch">
          Create an account
        </button>
      </p>
    </div>
  )
}
