import React from 'react';
import { cn } from '../../lib/utils';
import {
  Badge,
  Button,
  Icon,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Card,
  CardContent,
} from '../ui';

/**
 * StatusBadge
 * Intelligent badge mapping commerce statuses to accessible semantic variants.
 */
export function StatusBadge({
  status,
  variant,
  showDot = false,
  icon,
  size = "default",
  className,
  children,
  ...props
}) {
  const displayStatus = children || status || "";
  const normalized = String(displayStatus).toLowerCase().trim();

  // Determine variant automatically if not explicitly provided
  let computedVariant = variant;
  if (!computedVariant) {
    if (
      normalized.includes("deliver") ||
      normalized.includes("paid") ||
      normalized.includes("settled") ||
      normalized.includes("active") ||
      normalized.includes("publish") ||
      normalized.includes("complet") ||
      normalized.includes("success") ||
      normalized.includes("grade a") ||
      normalized.includes("live")
    ) {
      computedVariant = "success";
    } else if (
      normalized.includes("transit") ||
      normalized.includes("dispatch") ||
      normalized.includes("pending") ||
      normalized.includes("awaiting") ||
      normalized.includes("staging") ||
      normalized.includes("pack") ||
      normalized.includes("pick") ||
      normalized.includes("review") ||
      normalized.includes("cod")
    ) {
      computedVariant = "warning";
    } else if (
      normalized.includes("cancel") ||
      normalized.includes("reject") ||
      normalized.includes("fail") ||
      normalized.includes("breach") ||
      normalized.includes("destruct") ||
      normalized.includes("urgent") ||
      normalized.includes("error")
    ) {
      computedVariant = "destructive";
    } else if (
      normalized.includes("manifest") ||
      normalized.includes("new") ||
      normalized.includes("info") ||
      normalized.includes("prepaid") ||
      normalized.includes("express")
    ) {
      computedVariant = "info";
    } else if (normalized.includes("vip")) {
      computedVariant = "vip";
    } else if (normalized.includes("gold")) {
      computedVariant = "gold";
    } else {
      computedVariant = "secondary";
    }
  }

  const dotColors = {
    success: "bg-status-success",
    warning: "bg-status-warning",
    destructive: "bg-status-danger",
    info: "bg-status-info",
    vip: "bg-purple-400",
    gold: "bg-amber-400",
    secondary: "bg-text-secondary",
  }[computedVariant] || "bg-status-info";

  return (
    <Badge
      variant={computedVariant}
      size={size}
      className={cn("gap-1 font-semibold whitespace-nowrap", className)}
      {...props}
    >
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors)} />
      )}
      {icon && (
        <Icon name={icon} className="material-symbols-outlined text-[13px] shrink-0" />
      )}
      <span>{displayStatus}</span>
    </Badge>
  );
}

/**
 * ConfirmDialog
 * Standard modal for confirming destructive or critical actions with primary/cancel buttons.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive", // 'destructive' | 'primary'
  isLoading = false,
  icon,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                variant === "destructive"
                  ? "bg-status-danger-bg text-status-danger"
                  : "bg-primary-fixed/40 text-primary"
              )}
            >
              <Icon
                name={icon || (variant === "destructive" ? "warning" : "help")}
                className="material-symbols-outlined text-[20px]"
              />
            </div>
            <DialogTitle className="text-base font-bold text-text-primary">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-text-secondary pl-13">
            {message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            type="button"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "primary"}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="gap-1.5 font-semibold"
            type="button"
          >
            {isLoading && <Icon name="sync" className="material-symbols-outlined text-[14px] animate-spin" />}
            <span>{confirmText}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * AppDialog
 * Clean, customizable modal dialog with header, scrollable body, and action footer.
 */
export function AppDialog({
  isOpen,
  onClose,
  title,
  description,
  maxWidth = "max-w-lg",
  footer,
  children,
  className,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
      <DialogContent className={cn(maxWidth, className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle className="text-base font-bold">{title}</DialogTitle>}
            {description && <DialogDescription className="text-xs text-text-secondary">{description}</DialogDescription>}
          </DialogHeader>
        )}

        <div className="py-2 overflow-y-auto max-h-[70vh]">
          {children}
        </div>

        {footer && <DialogFooter className="mt-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/**
 * AppDrawer
 * Standard slide-over drawer panel for detail views (e.g. order details, customer drilldowns).
 */
export function AppDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  actions,
  footer,
  width = "max-w-xl",
  children,
  className,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div
          className={cn(
            "w-screen bg-surface-container-lowest border-l border-border-subtle shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200",
            width,
            className
          )}
        >
          {/* Drawer Header */}
          <div className="p-space-md border-b border-border-subtle flex items-center justify-between gap-space-sm bg-surface-subtle shrink-0">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-sm text-sm font-bold text-text-primary truncate">
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs text-text-secondary truncate">{subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {actions}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onClose}
                className="text-secondary hover:text-text-primary"
                type="button"
                title="Close drawer"
              >
                <Icon name="close" className="material-symbols-outlined text-[18px]" />
              </Button>
            </div>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-space-md space-y-space-md">
            {children}
          </div>

          {/* Drawer Footer */}
          {footer && (
            <div className="p-space-md border-t border-border-subtle bg-surface-subtle shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * EmptyState
 * Reusable centered empty state container with icon, title, description, and action button.
 */
export function EmptyState({
  icon = "inbox",
  title = "No data available",
  description = "There are no records to display in this view.",
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border-subtle bg-surface-canvas/50 space-y-3",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-secondary">
        <Icon name={icon} className="material-symbols-outlined text-[24px]" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="font-semibold text-sm text-text-primary">{title}</h4>
        <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

/**
 * LoadingState
 * Module loading placeholder.
 */
export function LoadingState({
  message = "Loading operational telemetry...",
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-16 space-y-4 text-center",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="font-label-sm text-xs text-text-secondary">{message}</span>
    </div>
  );
}

/**
 * ErrorState
 * Error alert card with retry capability.
 */
export function ErrorState({
  title = "Failed to load operational data",
  message = "An error occurred while connecting to Everwear Commerce API.",
  onRetry,
  className,
}) {
  return (
    <Card className={cn("border-status-danger/30 bg-status-danger-bg/20 p-space-md", className)}>
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex items-start gap-3">
          <Icon name="error" className="material-symbols-outlined text-status-danger text-[22px] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-text-primary">{title}</h4>
            <p className="text-xs text-text-secondary">{message}</p>
          </div>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-status-danger/40 text-status-danger hover:bg-status-danger-bg shrink-0 gap-1"
            type="button"
          >
            <Icon name="refresh" className="material-symbols-outlined text-[14px]" />
            <span>Retry</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
