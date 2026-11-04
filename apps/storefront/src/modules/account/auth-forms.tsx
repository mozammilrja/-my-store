"use client"

import { cn } from "@/lib/utils"
import { login, signup } from "@lib/data/account"
import { notifyCartUpdated } from "@lib/util/cart-events"
import Input from "@modules/common/components/input"
import { AlertCircleIcon, ArrowRightIcon, HeartIcon, PackageIcon, TruckIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"

const PERKS = [
  { icon: PackageIcon, text: "Track orders and returns in one place" },
  { icon: HeartIcon, text: "Keep your wishlist on every device" },
  { icon: TruckIcon, text: "Saved addresses for a faster checkout" },
]

function ErrorBox({ message, testId }: { message: string | null; testId: string }) {
  if (!message) return null
  return (
    <p
      role="alert"
      data-testid={testId}
      className="flex items-start gap-2 rounded-lg bg-error-container px-3 py-2.5 text-sm font-medium text-on-error-container"
    >
      <AlertCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  )
}

type AuthAction = (state: { error: string | null }, form: FormData) => Promise<{ error: string | null }>

/**
 * Signing in can restore the account's saved bag. The success re-render
 * replaces this form at once, so effects here never run; tell the header's
 * bag count to reload as soon as the action returns instead.
 */
const withBagRefresh =
  (action: AuthAction): AuthAction =>
  async (state, form) => {
    const result = await action(state, form)
    if (!result.error) notifyCartUpdated()
    return result
  }

const loginWithBag = withBagRefresh(login)
const signupWithBag = withBagRefresh(signup)

/**
 * Sign in and create-account, as one card with a switch between them. On a
 * wide screen an editorial panel sits beside it. A successful submit sets the
 * session cookie on the server and refreshes the page into the account.
 */
export function AuthForms() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const router = useRouter()
  const [loginState, loginAction, loggingIn] = useActionState(loginWithBag, { error: null })
  const [signupState, signupAction, signupPending] = useActionState(signupWithBag, { error: null })
  const signingUp = signupPending
  const [submitted, setSubmitted] = useState(false)
  // React resets a form after its action runs; keep the email so a wrong
  // password only means retyping the password.
  const [email, setEmail] = useState("")

  // Server actions set the session cookie; re-render the page to show the account.
  useEffect(() => {
    if (submitted && !loggingIn && !signingUp && !loginState.error && !signupState.error) {
      router.refresh()
    }
  }, [submitted, loggingIn, signingUp, loginState.error, signupState.error, router])

  const registering = mode === "register"

  return (
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_8px_40px_-12px_rgba(0,0,0,0.18)] md:grid-cols-2">
      {/* Editorial panel */}
      <div className="relative hidden min-h-[560px] md:block">
        <Image
          src="/images/concierge/hero-salon.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 40vw, 0px"
          className="object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-black/5 p-10 text-white">
          <span className="font-label-caps uppercase tracking-[0.2em] text-white/70">Everwear</span>
          <p className="mt-2 font-headline-lg font-light leading-tight">
            Everyday style.
            <br />
            Your way.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                  <Icon aria-hidden className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form card */}
      <div
        className="flex flex-col justify-center gap-6 px-6 py-10 sm:px-12"
        data-testid={registering ? "register-page" : "login-page"}
      >
        <div role="tablist" aria-label="Account" className="grid grid-cols-2 rounded-full bg-surface-container-low p-1">
          {(
            [
              ["login", "Sign in"],
              ["register", "Create account"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              data-testid={value === "register" ? "register-switch" : "login-switch"}
              className={cn(
                "h-9 cursor-pointer rounded-full text-sm font-semibold transition-colors",
                mode === value
                  ? "bg-surface-container-lowest text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="font-headline-lg text-foreground">
            {registering ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {registering
              ? "Join Everwear to track orders and check out faster."
              : "Sign in to see your orders, wishlist and saved addresses."}
          </p>
        </div>

        {registering ? (
          <form action={signupAction} onSubmit={() => setSubmitted(true)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" name="firstName" autoComplete="given-name" required data-testid="first-name-input" />
              <Input label="Last name" name="lastName" autoComplete="family-name" required data-testid="last-name-input" />
            </div>
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="email-input"
            />
            <Input label="Phone (optional)" name="phone" type="tel" autoComplete="tel" data-testid="phone-input" />
            <Input
              label="Password (8+ characters)"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              data-testid="password-input"
            />
            <ErrorBox message={signupState.error} testId="register-error" />
            <SubmitButton busy={signingUp} busyLabel="Creating account…" testId="register-button">
              Create account
            </SubmitButton>
          </form>
        ) : (
          <form action={loginAction} onSubmit={() => setSubmitted(true)} className="flex flex-col gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="email-input"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              data-testid="password-input"
            />
            <ErrorBox message={loginState.error} testId="login-error-message" />
            <SubmitButton busy={loggingIn} busyLabel="Signing in…" testId="sign-in-button">
              Sign in
            </SubmitButton>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {registering ? "Already have an account? " : "New to Everwear? "}
          <button
            type="button"
            onClick={() => setMode(registering ? "login" : "register")}
            className="cursor-pointer font-semibold text-foreground underline underline-offset-4 hover:text-secondary"
          >
            {registering ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  )
}

function SubmitButton({
  busy,
  busyLabel,
  testId,
  children,
}: {
  busy: boolean
  busyLabel: string
  testId: string
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      data-testid={testId}
      className="group mt-1 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? busyLabel : children}
      {!busy && <ArrowRightIcon aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />}
    </button>
  )
}
