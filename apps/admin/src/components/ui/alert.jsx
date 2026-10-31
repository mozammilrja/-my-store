import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-space-md text-body",
  {
    variants: {
      variant: {
        default: "border-subtle bg-surface-container-lowest text-primary",
        destructive: "border-status-danger/25 bg-status-danger-bg text-primary",
        warning: "border-status-warning/25 bg-status-warning-bg text-primary",
        info: "border-status-info/25 bg-status-info-bg text-primary",
        success: "border-status-success/25 bg-status-success-bg text-primary",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("text-label-lg text-primary", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-1 text-meta text-muted", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
