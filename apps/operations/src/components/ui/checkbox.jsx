import React from "react";
import { cn } from "../../lib/utils";

export const Checkbox = React.forwardRef(({ className, checked = false, onChange, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    checked={checked}
    onChange={onChange}
    className={cn(
      "h-4 w-4 cursor-pointer rounded border border-strong accent-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-container-lowest disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";
