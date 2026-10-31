import { Icon } from "@/components/ui/icon"

export function MetricsTicker() {
  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-container-low rounded-lg p-4 flex items-center gap-3">
          <Icon name="dry_cleaning" size={24} className="text-primary" />
          <div>
            <span className="font-label-sm text-label-sm font-semibold text-on-surface block">
              Pre-Shrunk 100% Cotton
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Lab-tested color fastness
            </span>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-lg p-4 flex items-center gap-3">
          <Icon name="straighten" size={24} className="text-primary" />
          <div>
            <span className="font-label-sm text-label-sm font-semibold text-on-surface block">
              Calibrated Indian Fit
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Sized XS to 4XL tailored precision
            </span>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-lg p-4 flex items-center gap-3">
          <Icon name="local_shipping" size={24} className="text-primary" />
          <div>
            <span className="font-label-sm text-label-sm font-semibold text-on-surface block">
              Same-Day Dispatch
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              In 18 metro hub pincodes
            </span>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-lg p-4 flex items-center gap-3">
          <Icon name="swap_horizontal_circle" size={24} className="text-primary" />
          <div>
            <span className="font-label-sm text-label-sm font-semibold text-on-surface block">
              Doorstep Try &amp; Exchange
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              14-day zero hassle pickup
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
