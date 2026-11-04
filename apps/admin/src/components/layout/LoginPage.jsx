import React, { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Icon, Input } from '../ui'
import { describeError } from '../shared/FeedbackAndOverlays'
import { BrandMark } from './BrandMark'
import { useSession } from '../../lib/session'

/** Where to land after signing in: the page the viewer was sent away from, or the overview. */
const destinationFrom = (location) => {
  const from = location.state?.from
  if (!from?.pathname || from.pathname === '/login') return '/overview'
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
}

/** Plain words for a failed sign-in, keyed off the API's error code. */
const describeLoginError = (error) => {
  if (error?.status === 401) {
    return { title: 'Email or password is incorrect', hint: 'Check both and try again.' }
  }
  if (error?.status === 429) {
    return {
      title: 'Sign-in is paused for this email',
      hint: 'The API has paused sign-ins for this email for up to 15 minutes. Try again later, or use another account.',
    }
  }
  if (error?.status === 400) {
    return { title: 'Enter a valid email and password', hint: error.message }
  }
  const info = describeError(error)
  return { title: info.headline, hint: error?.message || info.hint }
}

/**
 * LoginPage
 * The only screen a signed-out viewer can reach. Signing in stores the token,
 * which the route guard picks up, so this page never navigates on a guess.
 */
export function LoginPage() {
  const { isSignedIn, signIn } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [missing, setMissing] = useState(false)
  const emailRef = useRef(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  if (isSignedIn) return <Navigate to={destinationFrom(location)} replace />

  const expired = location.state?.reason === 'expired'

  const onSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return
    // Read the fields themselves: a browser autofill is not in React state
    // until the viewer interacts with the page.
    const form = new FormData(event.currentTarget)
    const typedEmail = String(form.get('email') ?? email).trim()
    const typedPassword = String(form.get('password') ?? password)
    if (!typedEmail || !typedPassword) {
      setMissing(true)
      return
    }
    setMissing(false)
    setError(null)
    setIsSubmitting(true)
    try {
      await signIn(typedEmail, typedPassword)
      navigate(destinationFrom(location), { replace: true })
    } catch (err) {
      setError(err)
      setPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const problem = error ? describeLoginError(error) : null

  return (
    <main className="grid min-h-screen bg-surface-canvas text-primary antialiased lg:grid-cols-12">
      {/* Brand panel: what this place is, shown once the screen has room for it. */}
      <aside className="relative hidden overflow-hidden bg-primary-container text-on-accent lg:col-span-5 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-black/20 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <BrandMark src="/brand/aveliq-monogram-mark.svg" label="AVELIQ" className="h-12 w-12" />
          <BrandMark
            src="/brand/aveliq-wordmark-mark.svg"
            label=""
            aria-hidden="true"
            align="left"
            className="h-7 w-40"
          />
        </div>

        <div className="relative flex max-w-md flex-col gap-space-lg">
          <h2 className="text-display font-semibold tracking-tight">Run the Everwear store from one place.</h2>
          <ul className="flex flex-col gap-3 text-body-lg text-on-accent/85">
            {[
              ['shopping_bag', 'Orders, returns and shipments'],
              ['checkroom', 'Products, collections and stock'],
              ['receipt_long', 'GST invoices, payments and refunds'],
            ].map(([icon, label]) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Icon name={icon} aria-hidden="true" className="material-symbols-outlined text-icon-md" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-meta text-on-accent/70">Everwear admin · India</p>
      </aside>

      {/* Form */}
      <section className="flex items-center lg:col-span-7 justify-center px-6 py-space-xl sm:px-12">
        <div className="flex w-full max-w-sm flex-col gap-space-xl">
          <div className="flex items-center gap-2.5 text-primary lg:hidden">
            <BrandMark src="/brand/aveliq-monogram-mark.svg" label="AVELIQ" className="h-9 w-9" />
            <BrandMark
              src="/brand/aveliq-wordmark-mark.svg"
              label=""
              aria-hidden="true"
              align="left"
              className="h-5 w-28"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <h1 className="text-display text-primary">Welcome back</h1>
            <p className="text-body-lg text-muted">Sign in with your Everwear admin account.</p>
          </div>

          {expired && !problem && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-status-warning/25 bg-status-warning-bg p-3.5"
            >
              <Icon name="lock_clock" aria-hidden="true" className="material-symbols-outlined mt-0.5 text-icon-md text-warning" />
              <div className="flex flex-col gap-0.5">
                <span className="text-label-lg text-primary">Your session has ended</span>
                <span className="text-meta text-muted">Sign in again to pick up where you left off.</span>
              </div>
            </div>
          )}

          {problem && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-status-danger/25 bg-status-danger-bg p-3.5"
            >
              <Icon name="error" aria-hidden="true" className="material-symbols-outlined mt-0.5 text-icon-md text-danger" />
              <div className="flex flex-col gap-0.5">
                <span className="text-label-lg text-primary">{problem.title}</span>
                {problem.hint && <span className="text-meta leading-relaxed text-muted">{problem.hint}</span>}
              </div>
            </div>
          )}

          <form className="flex flex-col gap-space-md" onSubmit={onSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-label-lg text-primary">
                Email
              </label>
              <Input
                ref={emailRef}
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@everwear.com"
                className="h-11 px-3.5 text-body-lg"
                aria-invalid={error?.status === 401 || undefined}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-label-lg text-primary">
                Password
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 px-3.5 pr-12 text-body-lg"
                  aria-invalid={error?.status === 401 || undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition-colors hover:text-primary"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <Icon
                    name={showPassword ? 'visibility_off' : 'visibility'}
                    aria-hidden="true"
                    className="material-symbols-outlined text-icon-md"
                  />
                </button>
              </div>
            </div>

            {missing && (
              <p role="alert" className="text-meta text-danger">
                Enter your email and password.
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" className="mt-1 h-11 w-full text-body-lg" disabled={isSubmitting}>
              {isSubmitting && (
                <Icon name="sync" aria-hidden="true" className="material-symbols-outlined animate-spin text-icon-md" />
              )}
              <span>{isSubmitting ? 'Signing in' : 'Sign in'}</span>
            </Button>
          </form>

          <p className="text-meta text-muted">
            No account yet? An owner can invite you from Users &amp; Role Access.
          </p>
        </div>
      </section>
    </main>
  )
}
