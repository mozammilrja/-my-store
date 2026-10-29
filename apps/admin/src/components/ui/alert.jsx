import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-surface-container-lowest text-text-primary border-border-subtle",
        destructive:
          "border-status-danger/20 bg-status-danger-bg/40 text-text-primary",
        warning:
          "border-status-warning/20 bg-status-warning-bg/40 text-text-primary",
        info:
          "border-status-info/20 bg-status-info-bg/40 text-text-primary",
        success:
          "border-status-success/20 bg-status-success-bg/40 text-text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight font-label-xs-caps uppercase", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs [&_p]:leading-relaxed text-text-secondary mt-1", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
