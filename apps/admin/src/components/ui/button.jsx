import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary-container text-on-primary hover:bg-primary shadow-sm",
        primary:
          "bg-primary text-on-primary hover:bg-primary-container shadow-sm",
        destructive:
          "bg-status-danger text-on-error hover:bg-red-700 shadow-sm",
        outline:
          "border border-border-subtle bg-transparent hover:bg-surface-subtle text-text-primary",
        secondary:
          "bg-surface-subtle text-text-primary hover:bg-surface-container-high border border-border-subtle shadow-xs",
        ghost:
          "text-text-secondary hover:bg-surface-subtle hover:text-text-primary",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto font-semibold",
        success:
          "bg-status-success text-on-primary hover:bg-emerald-700 shadow-sm",
        warning:
          "bg-status-warning text-white hover:bg-amber-700 shadow-sm",
        subtle:
          "bg-surface-container-high text-text-primary hover:bg-surface-container",
      },
      size: {
        default: "h-9 px-4 py-2 text-sm",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-xl px-6 text-base",
        icon: "h-8 w-8 p-0 rounded-lg",
        iconSm: "h-7 w-7 p-0 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
