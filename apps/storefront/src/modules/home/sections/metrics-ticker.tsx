export function MetricsTicker() {
  return (
    <section className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-container-low rounded-lg p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px] shrink-0">
            dry_cleaning
          </span>
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
          <span className="material-symbols-outlined text-primary text-[24px] shrink-0">
            straighten
          </span>
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
          <span className="material-symbols-outlined text-primary text-[24px] shrink-0">
            local_shipping
          </span>
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
          <span className="material-symbols-outlined text-primary text-[24px] shrink-0">
            swap_horizontal_circle
          </span>
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
