import React from "react";
import { cn } from "../../lib/utils";

/**
 * Dialog
 * Closes on Escape and on a backdrop click, locks the page behind it and
 * moves focus into the panel so keyboard users do not land behind the scrim.
 */
export const Dialog = ({ open, onOpenChange, labelledBy, children }) => {
  const panelRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onOpenChange?.(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      (target || panel).focus?.();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-overlay flex animate-fade-in items-center justify-center overflow-y-auto bg-scrim/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange?.(false);
      }}
    >
      <div ref={panelRef} className="contents">
        {children}
      </div>
    </div>
  );
};

export const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    tabIndex={-1}
    className={cn(
      "my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-lg animate-zoom-in flex-col rounded-xl border border-subtle bg-overlay shadow-xl focus:outline-none",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex shrink-0 flex-col gap-0.5 p-space-lg pb-space-md", className)} {...props} />
);

export const DialogBody = ({ className, ...props }) => (
  <div className={cn("scrollbar-thin min-h-0 flex-1 overflow-y-auto px-space-lg", className)} {...props} />
);

export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-heading text-primary", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-meta text-muted", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

export const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex shrink-0 flex-col-reverse gap-2 border-t border-subtle p-space-lg pt-space-md sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
);
