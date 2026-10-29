import { getStorePolicies } from "@lib/data/store-policies"
import { formatDayRange } from "@lib/util/store-policies"

/**
 * One line of verified store policy for the visitor's region. Renders nothing
 * when the region has no policy data, so no claim is ever made up.
 */
export async function Announcement({ countryCode }: { countryCode: string }) {
  const { current } = await getStorePolicies(countryCode).catch(() => ({ current: null }))

  if (!current) {
    return null
  }

  const delivery = formatDayRange({
    min: current.handlingDays.min + current.transitDays.min,
    max: current.handlingDays.max + current.transitDays.max,
  })

  return (
    <div className="bg-invert text-invert-foreground">
      <p className="mx-auto max-w-[1440px] px-4 py-2 text-center text-xs tracking-wide">
        Delivery in {delivery} business days
        <span aria-hidden className="mx-3 opacity-50">/</span>
        {current.returnWindowDays}-day {current.freeReturns ? "free " : ""}returns
      </p>
    </div>
  )
}
