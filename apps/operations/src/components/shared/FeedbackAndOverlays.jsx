import React, { useEffect } from 'react';
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
  DialogBody,
  DialogFooter,
  Card,
} from '../ui';
import { endSession } from '../../portal/client';
import { SkeletonRegion, SkeletonTable, SkeletonStatsGrid } from './Skeleton';

const SUCCESS_WORDS = ['deliver', 'paid', 'settled', 'active', 'publish', 'complet', 'success', 'grade a', 'live', 'approved', 'reconciled'];
const WARNING_WORDS = ['transit', 'dispatch', 'pending', 'awaiting', 'staging', 'pack', 'pick', 'review', 'cod', 'hold', 'partial'];
const DANGER_WORDS = ['cancel', 'reject', 'fail', 'breach', 'destruct', 'urgent', 'error', 'overdue', 'expired', 'blocked'];
const INFO_WORDS = ['manifest', 'new', 'info', 'prepaid', 'express', 'draft', 'scheduled'];

/**
 * StatusBadge
 * Maps a commerce status string onto one of the tinted Badge variants, so
 * the same word always reads the same colour across all sixteen modules.
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
  const displayStatus = children ?? status ?? "";
  const normalized = String(displayStatus).toLowerCase().trim();

  let computedVariant = variant;
  if (!computedVariant) {
    if (SUCCESS_WORDS.some((w) => normalized.includes(w))) computedVariant = "success";
    else if (WARNING_WORDS.some((w) => normalized.includes(w))) computedVariant = "warning";
    else if (DANGER_WORDS.some((w) => normalized.includes(w))) computedVariant = "destructive";
    else if (INFO_WORDS.some((w) => normalized.includes(w))) computedVariant = "info";
    else if (normalized.includes("vip")) computedVariant = "vip";
    else if (normalized.includes("gold")) computedVariant = "gold";
    else computedVariant = "secondary";
  }

  const dotColor = {
    success: "bg-status-success",
    warning: "bg-status-warning",
    destructive: "bg-status-danger",
    info: "bg-status-info",
    vip: "bg-primary",
    gold: "bg-status-warning",
    secondary: "bg-text-faint",
  }[computedVariant] || "bg-status-info";

  return (
    <Badge
      variant={computedVariant}
      size={size}
      className={cn("whitespace-nowrap font-semibold", className)}
      {...props}
    >
      {showDot && <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor)} />}
      {icon && <Icon name={icon} aria-hidden="true" className="material-symbols-outlined shrink-0 text-icon-sm" />}
      <span>{displayStatus}</span>
    </Badge>
  );
}

/**
 * ConfirmDialog
 * Confirmation for a destructive or irreversible action.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  isLoading = false,
  icon,
}) {
  const isDestructive = variant === "destructive";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                isDestructive
                  ? "bg-status-danger-bg text-danger"
                  : "bg-primary-fixed text-on-primary-fixed"
              )}
            >
              <Icon
                name={icon || (isDestructive ? "warning" : "help")}
                aria-hidden="true"
                className="material-symbols-outlined text-icon-lg"
              />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{message}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "primary"}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && (
              <Icon name="sync" aria-hidden="true" className="material-symbols-outlined animate-spin text-icon-sm" />
            )}
            <span>{confirmText}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * AppDialog
 * Header, scrolling body, action footer.
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
  bodyClassName,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
      <DialogContent className={cn(maxWidth, className)}>
        {(title || description) && (
          <DialogHeader>
            <div className="flex items-start justify-between gap-space-md">
              <div className="flex min-w-0 flex-col gap-0.5">
                {title && <DialogTitle>{title}</DialogTitle>}
                {description && <DialogDescription>{description}</DialogDescription>}
              </div>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onClose}
                title="Close"
                aria-label="Close dialog"
                className="-mr-1 shrink-0"
              >
                <Icon name="close" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
              </Button>
            </div>
          </DialogHeader>
        )}

        <DialogBody className={cn("py-1", bodyClassName)}>{children}</DialogBody>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/**
 * AppDrawer
 * Right-hand slide-over for detail views. Closes on Escape and on the scrim,
 * and locks the page behind it so the body does not scroll underneath.
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
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-overlay overflow-hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 animate-fade-in bg-scrim/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          className={cn(
            "flex w-screen animate-slide-in-from-right flex-col justify-between border-l border-subtle bg-surface-container-lowest shadow-2xl",
            width,
            className
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-space-sm border-b border-subtle bg-surface-subtle p-space-md">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-subheading font-semibold text-primary">
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && <p className="truncate text-meta text-muted">{subtitle}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {actions}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onClose}
                title="Close panel"
                aria-label="Close panel"
              >
                <Icon name="close" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
              </Button>
            </div>
          </div>

          <div className="scrollbar-thin flex flex-1 flex-col gap-space-md overflow-y-auto p-space-md">
            {children}
          </div>

          {footer && (
            <div className="shrink-0 border-t border-subtle bg-surface-subtle p-space-md">
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
 * A short message and the one action that resolves it.
 */
export function EmptyState({
  icon = "inbox",
  title = "Nothing here yet",
  description = "There are no records to display in this view.",
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-strong bg-surface-subtle/60 p-10 text-center",
        className
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-subtle bg-surface-container-lowest text-faint">
        <Icon name={icon} aria-hidden="true" className="material-symbols-outlined text-icon-lg" />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <h4 className="text-body font-semibold text-primary">{title}</h4>
        <p className="text-meta leading-relaxed text-muted">{description}</p>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

/**
 * LoadingState
 * Inline spinner for a small region. Whole pages and panels use the Skeleton
 * family instead, so the wait has the shape of the content.
 */
export function LoadingState({ message = "Loading", className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 p-10 text-center", className)}
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-meta text-muted">{message}</span>
    </div>
  );
}

/**
 * What went wrong, in the reader's terms. The API client tags every failure
 * with a status and a code; this turns those into a headline, a next step and
 * a tone, so the same failure reads the same way on every page.
 */
export function describeError(error) {
  const status = error?.status
  const code = error?.code
  if (status === 401 || code === 'session_expired' || code === 'unauthorized') {
    return {
      kind: 'session',
      icon: 'lock_clock',
      tone: 'warning',
      headline: 'Your admin session has ended',
      hint: 'Sign in again to load this page. Nothing you saved has been lost.',
    }
  }
  if (status === 429 || code === 'rate_limited') {
    return {
      kind: 'rate-limited',
      icon: 'hourglass_top',
      tone: 'warning',
      headline: 'Too many sign-in attempts',
      hint: 'The API paused sign-ins for a few minutes. Wait a moment, then try again.',
    }
  }
  if (status === 403 || code === 'forbidden') {
    return {
      kind: 'forbidden',
      icon: 'block',
      tone: 'warning',
      headline: "Your role can't open this page",
      hint: 'Ask an owner to change your access in Users & Role Access.',
    }
  }
  if (status === 503 || code === 'unavailable') {
    return {
      kind: 'offline',
      icon: 'sync_problem',
      tone: 'danger',
      headline: "Can't reach the Everwear API",
      hint: 'Check that the backend is running and the connection is up, then retry.',
    }
  }
  if (status === 404 || code === 'not_found') {
    return {
      kind: 'not-found',
      icon: 'search',
      tone: 'info',
      headline: 'This record no longer exists',
      hint: 'It may have been deleted or moved. Go back to the list and pick another.',
    }
  }
  return {
    kind: 'error',
    icon: 'error',
    tone: 'danger',
    headline: 'Something went wrong',
    hint: 'The API returned an error. Retry, and if it keeps happening check the backend logs.',
  }
}

const ERROR_TONES = {
  danger: { panel: 'border-status-danger/25 bg-status-danger-bg', icon: 'text-danger' },
  warning: { panel: 'border-status-warning/25 bg-status-warning-bg', icon: 'text-warning' },
  info: { panel: 'border-status-info/25 bg-status-info-bg', icon: 'text-info' },
}

/** Ends the stale session; the route guard then shows the sign-in page. */
const signInAgain = () => {
  void endSession()
}

/**
 * ErrorState
 * The one failure notice every page uses. Pass the thrown `error` and it
 * picks the icon, tone and next step for that kind of failure.
 *
 * - `variant="page"`: the page could not load at all. Fills the content area
 *   with a centred panel instead of a page of zeros and empty tables.
 * - `variant="inline"` (default): a banner over content that is still on
 *   screen, such as a background refresh that failed.
 */
export function ErrorState({
  title,
  message,
  error,
  onRetry,
  variant = 'inline',
  className,
}) {
  const info = describeError(error)
  const tone = ERROR_TONES[info.tone]
  const heading = title || info.headline
  const detail = message || error?.message
  const isSession = info.kind === 'session'

  const actions = (
    <>
      {isSession && (
        <Button variant="primary" size="sm" onClick={signInAgain}>
          <Icon name="key" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
          <span>Sign in again</span>
        </Button>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <Icon name="refresh" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
          <span>Retry</span>
        </Button>
      )}
    </>
  )

  if (variant === 'page') {
    return (
      <Card
        role="alert"
        className={cn(
          'flex min-h-[20rem] flex-col items-center justify-center gap-space-md p-10 text-center',
          className
        )}
      >
        <span
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl border',
            tone.panel,
            tone.icon
          )}
        >
          <Icon name={info.icon} aria-hidden="true" className="material-symbols-outlined text-icon-xl" />
        </span>
        <div className="flex max-w-md flex-col gap-1.5">
          <h2 className="text-heading font-semibold text-primary">{heading}</h2>
          {detail && <p className="text-body text-secondary">{detail}</p>}
          <p className="text-meta text-muted">{info.hint}</p>
        </div>
        {(isSession || onRetry) && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">{actions}</div>
        )}
      </Card>
    )
  }

  return (
    <Card className={cn('p-space-md', tone.panel, className)} role="alert">
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <div className="flex min-w-0 items-start gap-3">
          <Icon
            name={info.icon}
            aria-hidden="true"
            className={cn('material-symbols-outlined mt-0.5 shrink-0 text-icon-lg', tone.icon)}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <h4 className="text-body font-semibold text-primary">{heading}</h4>
            <p className="text-meta text-muted">{detail || info.hint}</p>
          </div>
        </div>
        {(isSession || onRetry) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </Card>
  )
}

/**
 * PageBody
 * Everything under a module's PageHeader. When the page's main query failed
 * and there is nothing to show, it replaces the body with one page-level
 * error, so the reader never sees a wall of zeros that looks like real data.
 * When older data is still on screen it keeps it and adds an inline banner.
 *
 *   <PageHeader ... />
 *   <PageBody error={q.error} hasData={q.data != null} title="Orders could not be loaded" onRetry={q.refetch}>
 *     ...stats, tables, panels
 *   </PageBody>
 */
export function PageBody({ error, hasData = false, title, onRetry, children }) {
  if (!error) return children
  const retry = onRetry ? () => onRetry() : undefined
  if (!hasData) {
    return <ErrorState variant="page" error={error} title={title} onRetry={retry} />
  }
  return (
    <>
      <ErrorState error={error} title={title} onRetry={retry} />
      {children}
    </>
  )
}

/**
 * ModuleState
 * The loading / error / empty decision every module repeats, in one place.
 * Returns `null` once there is data to render, so a background refetch keeps
 * the current content on screen instead of flashing a skeleton.
 *
 *   const gate = <ModuleState isLoading={q.isLoading} isError={q.isError} ... />
 *   if (gate) return gate
 */
export function ModuleState({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty = false,
  skeleton,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  errorTitle,
  label = "Loading",
}) {
  if (isLoading) {
    return (
      skeleton || (
        <SkeletonRegion label={label} className="flex flex-col gap-space-lg">
          <SkeletonStatsGrid count={4} />
          <SkeletonTable rows={6} columns={6} />
        </SkeletonRegion>
      )
    );
  }

  if (isError) {
    return (
      <ErrorState variant="page" error={error} title={errorTitle} onRetry={onRetry} />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return null;
}
