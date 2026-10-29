import { Container } from "@/components/store/container"
import type { RegionPolicies } from "@lib/api/types"
import { formatMoney } from "@lib/money"
import { formatDayRange } from "@lib/util/policies"

export const formatShippingRate = (rate: number, currency: string) => (rate === 0 ? "Free" : formatMoney(rate, currency))

export const PolicyPage = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Container className="max-w-3xl py-14" data-testid="policy-page">
    <h1 className="mb-8 font-display-tight text-6xl">{title}</h1>
    <div className="flex flex-col gap-6 text-base leading-relaxed">{children}</div>
  </Container>
)

export const PoliciesUnavailable = () => (
  <p className="text-muted-foreground">Policy details for this region haven&apos;t been published yet.</p>
)

export const ShippingSummary = ({ policies, currency }: { policies: RegionPolicies; currency: string }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y py-6">
    <dt className="text-muted-foreground">Shipping rate</dt>
    <dd>{formatShippingRate(policies.shippingRate, currency)}</dd>
    <dt className="text-muted-foreground">Processing time</dt>
    <dd>{formatDayRange(policies.handlingDays)} business days</dd>
    <dt className="text-muted-foreground">Delivery time</dt>
    <dd>{formatDayRange(policies.transitDays)} business days after dispatch</dd>
  </dl>
)

export const PlaceholderNotice = () => (
  <p className="text-muted-foreground" data-testid="policy-placeholder">
    This is placeholder content. Replace it with your store&apos;s own text before launch.
  </p>
)
