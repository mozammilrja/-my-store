import { useState, type FormEvent } from "react"
import { Button, Input, Label, Notice } from "@/components/ui"
import { api, errorMessage, setToken } from "@/lib/api"

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [f, setF] = useState({ email: "", password: "", displayName: "", phone: "", fulfilmentModel: "seller" as "seller" | "platform" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { token } = await api<{ token: string }>(mode === "login" ? "/auth/login" : "/auth/register", { body: mode === "login" ? { email: f.email, password: f.password } : f })
      setToken(token)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-panel border border-line bg-panel p-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-9" />
          <div>
            <h1 className="text-lg font-semibold">Everwear Seller Hub</h1>
            <p className="text-sm text-ink-3">{mode === "login" ? "Sign in to your seller account" : "Sell on Everwear"}</p>
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
          {mode === "register" ? <p className="mt-1 text-xs text-ink-3">At least 10 characters.</p> : null}
        </div>
        {mode === "register" ? (
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium text-ink-2">Who ships your orders?</legend>
            {(
              [
                ["seller", "I ship them", "We send you orders; you pack and hand them to the courier."],
                ["platform", "Everwear ships them", "Send your stock to an Everwear warehouse; we pack and ship. A fee per unit applies."],
              ] as const
            ).map(([value, title, hint]) => (
              <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-control border p-3 ${f.fulfilmentModel === value ? "border-accent bg-accent-soft" : "border-line"}`}>
                <input type="radio" name="model" checked={f.fulfilmentModel === value} onChange={() => setF((x) => ({ ...x, fulfilmentModel: value }))} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="text-xs text-ink-3">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <Button type="submit" size="lg" className="w-full" busy={busy}>
          {mode === "login" ? "Sign in" : "Create seller account"}
        </Button>
        <p className="text-center text-sm text-ink-3">
          {mode === "login" ? "New to selling on Everwear? " : "Already a seller? "}
          <button type="button" className="font-medium text-accent underline" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Apply to sell" : "Sign in"}
          </button>
        </p>
      </form>
    </main>
  )
}
