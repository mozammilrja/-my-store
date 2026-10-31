import React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-9 w-full rounded-lg border border-strong bg-surface-container-lowest px-3 py-1.5 text-body text-primary shadow-xs transition-colors file:border-0 file:bg-transparent file:text-body file:font-medium placeholder:text-disabled hover:border-emphasis focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef(({ className, rows = 3, ...props }, ref) => (
  <textarea
    rows={rows}
    className={cn(
      "flex w-full rounded-lg border border-strong bg-surface-container-lowest px-3 py-2 text-body text-primary shadow-xs transition-colors placeholder:text-disabled hover:border-emphasis focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
