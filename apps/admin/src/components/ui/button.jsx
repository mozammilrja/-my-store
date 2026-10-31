import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * Button
 * Heights line up with Input and Select so a toolbar row never staggers:
 * sm 32px, default 36px, lg 40px, and the icon sizes match sm/default.
 * Solid status fills use the -solid tokens, which carry white text in both
 * themes; the plain status tokens are reserved for text and icons.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary-container text-on-accent shadow-xs hover:bg-primary-container-hover",
        primary:
          "bg-primary-container text-on-accent shadow-xs hover:bg-primary-container-hover",
        destructive:
          "bg-status-danger-solid text-on-accent shadow-xs hover:bg-status-danger-solid/90",
        success:
          "bg-status-success-solid text-on-accent shadow-xs hover:bg-status-success-solid/90",
        warning:
          "bg-status-warning-solid text-on-accent shadow-xs hover:bg-status-warning-solid/90",
        outline:
          "border border-subtle bg-surface-container-lowest text-primary shadow-xs hover:border-strong hover:bg-surface-subtle",
        secondary:
          "border border-subtle bg-surface-subtle text-primary shadow-xs hover:bg-surface-container",
        subtle:
          "bg-surface-container text-primary hover:bg-surface-container-high",
        ghost:
          "text-muted hover:bg-surface-subtle hover:text-primary",
        link:
          "h-auto p-0 text-label-lg text-accent underline-offset-4 hover:text-accent-hover hover:underline",
      },
      size: {
        default: "h-9 px-3.5 text-label-lg",
        sm: "h-8 px-3 text-label",
        lg: "h-10 px-5 text-label-lg",
        icon: "h-9 w-9 p-0",
        iconSm: "h-8 w-8 p-0",
        iconXs: "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { buttonVariants };
