import { OrderHeader, StitchPage } from "@modules/stitch/shell"

const bar = "rounded-lg bg-surface-container animate-pulse"

/** Placeholder in the confirmation page's own Stitch layout while the order loads. */
export default function Loading() {
  return (
    <StitchPage>
      <OrderHeader />
      <main className="w-full bg-surface min-h-[calc(100vh-20rem)]" aria-busy="true" aria-label="Loading your order">
        <div className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin pb-space-xl">
          <div className="pt-space-md pb-space-lg">
            <div className={`${bar} h-4 w-64`} />
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm mb-space-lg space-y-space-sm">
            <div className={`${bar} h-6 w-56 rounded-full`} />
            <div className={`${bar} h-16 w-full max-w-xl`} />
            <div className={`${bar} h-5 w-full max-w-2xl`} />
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm mb-space-xl">
            <div className={`${bar} h-24 w-full`} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            <div className="lg:col-span-8 rounded-xl bg-surface-container-lowest p-space-lg md:p-space-xl shadow-sm">
              <div className={`${bar} h-36 w-full`} />
            </div>
            <div className="lg:col-span-4 rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
              <div className={`${bar} h-48 w-full`} />
            </div>
          </div>
        </div>
      </main>
    </StitchPage>
  )
}
