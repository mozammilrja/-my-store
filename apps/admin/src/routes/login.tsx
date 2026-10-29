import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Alert, AlertDescription } from "@/components/reui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { sdk } from "@/lib/sdk"

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const result = await sdk.auth.login("user", "emailpass", { email, password })

      if (typeof result !== "string") {
        setError("This account needs another sign-in step that isn't supported here.")
        return
      }

      await queryClient.invalidateQueries({ queryKey: ["me"] })
      const from = (location.state as { from?: string } | null)?.from
      navigate(from || "/", { replace: true })
    } catch {
      setError("Email or password is incorrect.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-muted/40 flex min-h-svh items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-semibold">
            E
          </div>
          <span className="text-lg font-semibold tracking-tight">Everwear</span>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to manage your store</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit}>
              <FieldGroup>
                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="animate-spin" /> : null}
                  Sign in
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
