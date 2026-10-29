import React from "react";
import { cn } from "../../lib/utils";

export const Checkbox = React.forwardRef(({ className, checked, onChange, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    checked={checked}
    onChange={onChange}
    className={cn(
      "h-4 w-4 rounded border border-border-subtle text-primary-container focus:ring-1 focus:ring-primary-container accent-primary-container cursor-pointer",
      className
    )}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";
