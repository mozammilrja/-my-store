import { useState, type FormEvent } from "react"
import { Button, Input, Label, Notice } from "@/areas/shared/ui"
import { useNavigate } from "react-router"
import { api, errorMessage } from "@/areas/seller/lib/api"
import { usePortal } from "@/portal/session"

/**
 * Sign-up for a new seller account. Signing in is the portal's one form
 * (/login); once registered, the new account is signed in to the portal
 * the same way, so it lands in its own area.
 */
export function AuthScreen() {
  const portal = usePortal()
  const navigate = useNavigate()
  const [mode, setMode] = useState<"login" | "register">("register")
  const [f, setF] = useState({ email: "", password: "", displayName: "", phone: "", fulfilmentModel: "seller" as "seller" | "platform" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api<{ token: string }>("/auth/register", { body: f })
      await portal.signIn(f.email, f.password)
      navigate("/seller", { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-subtle bg-surface-container-lowest p-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-9" />
          <div>
            <h1 className="text-lg font-semibold">Everwear Seller Hub</h1>
            <p className="text-body text-muted">{mode === "login" ? "Sign in to your seller account" : "Sell on Everwear"}</p>
          </div>
        </div>
        {error ? <Notice>{error}</Notice> : null}
        {mode === "register" ? (
          <>
            <div>
              <Label htmlFor="name">Shop name (shown to customers)</Label>
              <Input id="name" required minLength={2} value={f.displayName} onChange={set("displayName")} />
            </div>
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" type="tel" required value={f.phone} onChange={set("phone")} placeholder="98450 12345" />
            </div>
          </>
        ) : null}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="username" value={f.email} onChange={set("email")} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={mode === "register" ? 10 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} value={f.password} onChange={set("password")} />
          {mode === "register" ? <p className="mt-1 text-meta text-muted">At least 10 characters.</p> : null}
        </div>
        {mode === "register" ? (
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-body font-medium text-secondary">Who ships your orders?</legend>
            {(
              [
                ["seller", "I ship them", "We send you orders; you pack and hand them to the courier."],
                ["platform", "Everwear ships them", "Send your stock to an Everwear warehouse; we pack and ship. A fee per unit applies."],
              ] as const
            ).map(([value, title, hint]) => (
              <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${f.fulfilmentModel === value ? "border-accent bg-accent-soft" : "border-subtle"}`}>
                <input type="radio" name="model" checked={f.fulfilmentModel === value} onChange={() => setF((x) => ({ ...x, fulfilmentModel: value }))} className="mt-1" />
                <span>
                  <span className="block text-body font-medium">{title}</span>
                  <span className="text-meta text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <Button type="submit" size="lg" className="w-full" busy={busy}>
          {mode === "login" ? "Sign in" : "Create seller account"}
        </Button>
        <p className="text-center text-body text-muted">
          {mode === "login" ? "New to selling on Everwear? " : "Already a seller? "}
          <button type="button" className="font-medium text-accent underline" onClick={() => (mode === "login" ? setMode("register") : navigate("/login"))}>
            {mode === "login" ? "Apply to sell" : "Sign in"}
          </button>
        </p>
      </form>
    </main>
  )
}
