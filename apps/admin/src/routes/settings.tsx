import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { RefreshCw, TriangleAlert } from "lucide-react"
import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useMe } from "@/hooks/use-me"
import { ApiError, adminApi } from "@/lib/api"
import type { StoreSettings } from "@/lib/types"

/**
 * The form is mounted with the saved settings as its starting point, so it
 * needs no effect to fill itself; a save remounts it through its key.
 */
const SettingsForm = ({
  settings,
  isOwner,
  onSaved,
  onError,
}: {
  settings: StoreSettings
  isOwner: boolean
  onSaved: (saved: StoreSettings) => void
  onError: (caught: unknown) => void
}) => {
  const [storeName, setStoreName] = useState(settings.storeName)
  const [threshold, setThreshold] = useState(String(settings.lowStockThreshold))
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail ?? "")

  const save = useMutation({
    mutationFn: () =>
      adminApi.updateSettings({
        storeName: storeName.trim(),
        lowStockThreshold: Math.round(Number(threshold)) || 0,
        supportEmail: supportEmail.trim() ? supportEmail.trim() : null,
      }),
    onSuccess: ({ settings: saved }) => {
      onSaved(saved)
      toast.success("Settings saved")
    },
    onError,
  })

  return (
    <>
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!isOwner || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? <Spinner /> : null}
          Save changes
        </Button>
      </div>
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          if (isOwner) save.mutate()
        }}
        className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2"
      >
        <Frame>
          <FrameHeader>
            <FrameTitle>Store</FrameTitle>
            <FrameDescription>How this store identifies itself</FrameDescription>
          </FrameHeader>
          <FramePanel>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="store-name">Store name</FieldLabel>
                <Input
                  id="store-name"
                  required
                  disabled={!isOwner}
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="support-email">Support email</FieldLabel>
                <Input
                  id="support-email"
                  type="email"
                  disabled={!isOwner}
                  placeholder="None"
                  value={supportEmail}
                  onChange={(event) => setSupportEmail(event.target.value)}
                />
                <FieldDescription>
                  Shown to staff only; the API sends no mail yet.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FramePanel>
        </Frame>

        <Frame>
          <FrameHeader>
            <FrameTitle>Inventory</FrameTitle>
            <FrameDescription>Thresholds the dashboard reports against</FrameDescription>
          </FrameHeader>
          <FramePanel>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="low-stock">Low stock threshold</FieldLabel>
                <Input
                  id="low-stock"
                  inputMode="numeric"
                  required
                  disabled={!isOwner}
                  value={threshold}
                  onChange={(event) => setThreshold(event.target.value)}
                />
                <FieldDescription>
                  A tracked variant at or under this count counts as low stock, on the
                  overview and in the sidebar.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FramePanel>
        </Frame>
      </form>
    </>
  )
}

const SettingsPage = () => {
  const queryClient = useQueryClient()
  const me = useMe()
  const isOwner = me.data?.role === "owner"
  const [error, setError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await adminApi.settings()).settings,
  })

  return (
    <>
      <PageHeader
        eyebrow="Customers & admin"
        title="Settings"
        description="Store details and the thresholds every other screen reads."
      />

      {!isOwner && !me.isPending ? (
        <Alert variant="info">
          <AlertDescription>
            Settings are read-only for staff accounts. An owner can change them.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="animate-in fade-in duration-200">
          <TriangleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {query.isPending ? (
        <Skeleton className="h-80" />
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load settings</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {query.error instanceof Error ? query.error.message : "Something went wrong."}
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              <RefreshCw />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <SettingsForm
          key={query.data.updatedAt ?? "unsaved"}
          settings={query.data}
          isOwner={isOwner}
          onSaved={(saved) => {
            setError(null)
            queryClient.setQueryData(["settings"], saved)
            // The threshold decides the dashboard's low-stock figures and nav counter.
            queryClient.invalidateQueries({ queryKey: ["operations"] })
          }}
          onError={(caught) =>
            setError(caught instanceof ApiError ? caught.message : "Could not save settings.")
          }
        />
      )}
    </>
  )
}

export default SettingsPage
