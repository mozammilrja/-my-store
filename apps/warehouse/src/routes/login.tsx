import { useState, type FormEvent } from "react"
import { api, errorMessage, setToken } from "@/lib/api"
import { Button, Input, Label, Notice } from "@/components/ui"

export function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { token } = await api<{ token: string }>("/auth/login", { body: { email, password } })
      setToken(token)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-panel border border-line bg-panel p-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-9" />
          <div>
            <h1 className="text-lg font-semibold">Everwear Warehouse</h1>
            <p className="text-sm text-ink-3">Sign in to start your shift</p>
          </div>
        </div>
        {error ? <Notice>{error}</Notice> : null}
        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="w-full" busy={busy}>
          Sign in
        </Button>
        <p className="text-xs text-ink-3">Accounts are created by the store admin. Ask your supervisor if you can't sign in.</p>
      </form>
    </main>
  )
}
