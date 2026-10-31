import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-container text-on-primary",
        secondary:
          "border-border-subtle bg-surface-subtle text-text-secondary",
        destructive:
          "border-status-danger/20 bg-status-danger-bg text-status-danger",
        outline:
          "border-border-subtle text-text-primary",
        success:
          "border-status-success/20 bg-status-success-bg text-status-success",
        warning:
          "border-status-warning/20 bg-status-warning-bg text-status-warning",
        info:
          "border-status-info/20 bg-status-info-bg text-status-info",
        vip:
          "border-transparent bg-primary-fixed text-on-primary-fixed font-bold",
        gold:
          "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
      },
      size: {
        default: "text-[11px] leading-3.5 px-2 py-0.5",
        sm: "text-[9px] leading-3 px-1.5 py-0.2",
        lg: "text-xs px-2.5 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Badge({ className, variant, size, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}
