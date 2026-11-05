import React from "react";
import { cn } from "../../lib/utils";

export const Progress = React.forwardRef(
  ({ className, value = 0, indicatorClassName, label, ...props }, ref) => {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          "relative h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high",
          className
        )}
        {...props}
      >
        <div
          className={cn("h-full rounded-full bg-primary transition-[width] duration-300 ease-out-expo", indicatorClassName)}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";
