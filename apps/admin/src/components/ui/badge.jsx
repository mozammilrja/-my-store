import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * Badge
 * Tinted variants pair a status foreground with its own tint, which keeps
 * every state badge above 4.5:1 in both themes. Solid variants exist for the
 * few places that ask for a filled pill and carry white text.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-container text-on-accent",
        secondary: "border-subtle bg-surface-subtle text-muted",
        outline: "border-subtle text-muted",
        success: "border-status-success/25 bg-status-success-bg text-success",
        warning: "border-status-warning/25 bg-status-warning-bg text-warning",
        destructive: "border-status-danger/25 bg-status-danger-bg text-danger",
        info: "border-status-info/25 bg-status-info-bg text-info",
        vip: "border-primary/25 bg-primary-fixed text-on-primary-fixed",
        gold: "border-status-warning/25 bg-status-warning-bg text-warning",
        "success-solid": "border-transparent bg-status-success-solid text-on-accent",
        "danger-solid": "border-transparent bg-status-danger-solid text-on-accent",
      },
      size: {
        sm: "px-1.5 py-0.5 text-micro",
        default: "px-2 py-0.5 text-micro",
        lg: "px-2.5 py-1 text-label",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Badge({ className, variant, size, ...props }) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { badgeVariants };
