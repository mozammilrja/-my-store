import { RefreshCwIcon, RulerIcon, SparklesIcon, TruckIcon } from "lucide-react"

export function MetricsTicker() {
  const metrics = [
    {
      icon: <SparklesIcon className="size-5 text-secondary" />,
      title: "Pre-Shrunk 100% Cotton",
      subtitle: "Lab-tested color fastness & drape",
    },
    {
      icon: <RulerIcon className="size-5 text-secondary" />,
      title: "Calibrated Precision Fit",
      subtitle: "Sized XS to 4XL tailored comfort",
    },
    {
      icon: <TruckIcon className="size-5 text-secondary" />,
      title: "Same-Day Dispatch",
      subtitle: "Across metropolitan delivery hubs",
    },
    {
      icon: <RefreshCwIcon className="size-5 text-secondary" />,
      title: "Doorstep Try & Exchange",
      subtitle: "14-day zero hassle pickup",
    },
  ]

  return (
    <section className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6" aria-label="Quality standards">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((item, idx) => (
          <div
            key={idx}
            className="bg-surface-container-low/80 hover:bg-surface-container-low border border-border/40 rounded-xl p-4 flex items-center gap-3.5 transition-colors"
          >
            <div className="size-10 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0 text-foreground shadow-2xs">
              {item.icon}
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-xs sm:text-sm font-bold text-foreground block leading-snug">
                {item.title}
              </span>
              <span className="font-body-sm text-[11px] sm:text-xs text-muted-foreground leading-tight mt-0.5">
                {item.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
