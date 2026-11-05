import { useState, type FormEvent } from "react"
import { Button, Input, Label, Notice, Select } from "@/components/ui"
import { api, errorMessage, setToken } from "@/lib/api"

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "", vehicleType: "bike", registration: "" })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { token } =
        mode === "login"
          ? await api<{ token: string }>("/auth/login", { body: { email: form.email, password: form.password } })
          : await api<{ token: string }>("/auth/register", {
              body: { email: form.email, password: form.password, name: form.name, phone: form.phone, vehicle: { type: form.vehicleType, ...(form.registration ? { registration: form.registration } : {}) } },
            })
      setToken(token)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-panel border border-line bg-panel p-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-9" />
          <div>
            <h1 className="text-lg font-semibold">Everwear Rider</h1>
            <p className="text-sm text-ink-3">{mode === "login" ? "Sign in to start your shift" : "Join our delivery fleet"}</p>
          </div>
        </div>
        {error ? <Notice>{error}</Notice> : null}
        {mode === "register" ? (
          <>
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required autoComplete="name" value={form.name} onChange={set("name")} />
            </div>
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" type="tel" inputMode="tel" required autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="98450 12345" />
            </div>
          </>
        ) : null}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="username" value={form.email} onChange={set("email")} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={mode === "register" ? 10 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={set("password")} />
          {mode === "register" ? <p className="mt-1 text-xs text-ink-3">At least 10 characters.</p> : null}
        </div>
        {mode === "register" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vehicle">Vehicle</Label>
              <Select id="vehicle" value={form.vehicleType} onChange={set("vehicleType")}>
                <option value="bike">Motorbike</option>
                <option value="scooter">Scooter</option>
                <option value="bicycle">Bicycle</option>
                <option value="van">Van</option>
              </Select>
            </div>
            {form.vehicleType !== "bicycle" ? (
              <div>
                <Label htmlFor="reg">Registration</Label>
                <Input id="reg" required value={form.registration} onChange={set("registration")} placeholder="KA 01 AB 1234" className="uppercase" />
              </div>
            ) : null}
          </div>
        ) : null}
        <Button type="submit" size="lg" className="w-full" busy={busy}>
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
        <p className="text-center text-sm text-ink-3">
          {mode === "login" ? "New rider? " : "Already registered? "}
          <button type="button" className="font-medium text-accent underline" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </form>
    </main>
  )
}
