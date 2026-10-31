import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Skeleton
 * Base placeholder. Draws a surface-toned block with a shimmer sweep that
 * stops by itself under `prefers-reduced-motion` (see index.css).
 * Decorative by default: the enclosing region owns the live-region label.
 */
export function Skeleton({ className, rounded = "md", ...props }) {
  const radius = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  }[rounded] || "rounded-md";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block overflow-hidden bg-surface-container",
        radius,
        className
      )}
      {...props}
    >
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-surface-container-high to-transparent" />
    </span>
  );
}

/**
 * SkeletonRegion
 * Wraps a skeleton layout so assistive technology announces the wait once
 * instead of reading every placeholder block.
 */
export function SkeletonRegion({ label = "Loading", className, children, ...props }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className} {...props}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Fixed-width text lines so the block occupies the same box as the copy it replaces. */
export function SkeletonText({ lines = 3, className, lineClassName, widths }) {
  const fallback = ["100%", "92%", "78%", "85%", "70%"];
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", lineClassName)}
          style={{ width: (widths && widths[i]) || fallback[i % fallback.length] }}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 32, className }) {
  return (
    <Skeleton
      rounded="full"
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonButton({ width = 96, size = "default", className }) {
  const height = { sm: 32, default: 36, lg: 40 }[size] || 36;
  return (
    <Skeleton rounded="lg" className={cn("shrink-0", className)} style={{ width, height }} />
  );
}

export function SkeletonBadge({ width = 64, className }) {
  return <Skeleton rounded="full" className={cn("h-5 shrink-0", className)} style={{ width }} />;
}

/** Matches SectionCard: bordered panel, header row, then body lines. */
export function SkeletonCard({ lines = 3, header = true, footer = false, className, children }) {
  return (
    <div className={cn("rounded-xl border border-subtle bg-surface-container-lowest shadow-xs", className)}>
      {header && (
        <div className="flex items-center justify-between gap-space-sm border-b border-subtle p-space-md">
          <div className="flex w-full flex-col gap-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <SkeletonButton width={84} size="sm" />
        </div>
      )}
      <div className="p-space-md">{children || <SkeletonText lines={lines} />}</div>
      {footer && (
        <div className="border-t border-subtle bg-surface-subtle p-space-sm">
          <Skeleton className="h-3 w-32" />
        </div>
      )}
    </div>
  );
}

/** Matches StatsCard's box so the KPI row does not reflow when data lands. */
export function SkeletonStatsCard({ progress = false, className }) {
  return (
    <div
      className={cn(
        "flex min-h-[7.5rem] flex-col justify-between rounded-xl border border-subtle bg-surface-container-lowest p-space-md shadow-xs",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton rounded="lg" className="h-7 w-7 shrink-0" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <Skeleton className="h-7 w-24" />
          <SkeletonBadge width={48} />
        </div>
        <Skeleton className="h-2.5 w-20" />
      </div>
      <div className="mt-space-sm border-t border-subtle pt-2">
        {progress ? <Skeleton rounded="full" className="h-1.5 w-full" /> : <Skeleton className="h-2.5 w-36" />}
      </div>
    </div>
  );
}

export function SkeletonStatsGrid({ count = 4, cols = 4, progress = false, className }) {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  }[cols] || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-space-md", colClasses, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatsCard key={i} progress={progress && i === 0} />
      ))}
    </div>
  );
}

/**
 * SkeletonTableRow
 * One row whose cell widths repeat on a fixed cycle, so successive rows
 * look varied without shifting as real values arrive.
 */
export function SkeletonTableRow({ columns = 6, index = 0, dense = false }) {
  const cycle = ["70%", "45%", "60%", "35%", "55%", "40%", "65%"];
  return (
    <tr className="border-b border-subtle">
      {Array.from({ length: columns }).map((_, c) => (
        <td key={c} className={cn("px-3 align-middle", dense ? "py-2" : "py-3")}>
          <Skeleton className="h-3.5" style={{ width: cycle[(index + c) % cycle.length] }} />
        </td>
      ))}
    </tr>
  );
}

/** A full table body, or a standalone table when `standalone` is set. */
export function SkeletonTable({ rows = 6, columns = 6, header = true, dense = false, className }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-subtle bg-surface-container-lowest shadow-xs", className)}>
      <table className="w-full border-collapse text-left">
        {header && (
          <thead className="bg-surface-subtle">
            <tr className="border-b border-subtle">
              {Array.from({ length: columns }).map((_, c) => (
                <th key={c} className="h-9 px-3 align-middle">
                  <Skeleton className="h-2.5 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <SkeletonTableRow key={r} columns={columns} index={r} dense={dense} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Toolbar above a table: tab pills on the left, search and filters on the right. */
export function SkeletonToolbar({ tabs = 4, filters = 2, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-stretch justify-between gap-space-sm rounded-xl border border-subtle bg-surface-container-lowest p-space-sm shadow-xs lg:flex-row lg:items-center",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} rounded="lg" className="h-7" style={{ width: 86 + (i % 3) * 18 }} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-space-xs">
        <Skeleton rounded="lg" className="h-8.5 w-56" />
        {Array.from({ length: filters }).map((_, i) => (
          <Skeleton key={i} rounded="lg" className="h-8.5 w-32" />
        ))}
      </div>
    </div>
  );
}

/** Field rows at the real control height so forms do not jump on load. */
export function SkeletonForm({ fields = 4, columns = 1, actions = true, className }) {
  const colClass = columns === 2 ? "sm:grid-cols-2" : "grid-cols-1";
  return (
    <div className={cn("flex flex-col gap-space-md", className)}>
      <div className={cn("grid gap-space-md", colClass)}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton rounded="lg" className="h-9 w-full" />
            <Skeleton className="h-2.5 w-40" />
          </div>
        ))}
      </div>
      {actions && (
        <div className="flex items-center justify-end gap-2 border-t border-subtle pt-space-md">
          <SkeletonButton width={88} size="sm" />
          <SkeletonButton width={120} size="sm" />
        </div>
      )}
    </div>
  );
}

/**
 * SkeletonChart
 * Plots placeholder bars on the same baseline the real chart uses, so the
 * panel keeps its height and the axis row stays put.
 */
export function SkeletonChart({ bars = 10, height = 256, legend = true, className }) {
  const pattern = [38, 62, 48, 80, 55, 92, 70, 84, 58, 44, 76, 66];
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl border border-subtle bg-surface-canvas p-space-md",
        className
      )}
      style={{ height }}
    >
      {legend && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-2.5 w-20" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
      )}
      <div className="flex flex-1 items-end gap-1.5 pt-space-md sm:gap-3">
        {Array.from({ length: bars }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-full w-full items-end justify-center">
              <Skeleton
                rounded="sm"
                className="w-full max-w-[14px]"
                style={{ height: `${pattern[i % pattern.length]}%` }}
              />
            </div>
            <Skeleton className="h-2 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stacked rows with an optional leading avatar or thumbnail. */
export function SkeletonList({ items = 5, avatar = false, thumbnail = false, lines = 2, className }) {
  return (
    <div className={cn("flex flex-col gap-space-xs", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 rounded-xl border border-subtle p-2.5"
        >
          {avatar && <SkeletonAvatar size={32} />}
          {thumbnail && <Skeleton rounded="md" className="h-11 w-9 shrink-0" />}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            {lines > 1 && (
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-2.5 w-40" />
                <SkeletonBadge width={56} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The sidebar tree, for the rare case the nav itself is still resolving. */
export function SkeletonSidebar({ sections = 4, itemsPerSection = 3, className }) {
  return (
    <div className={cn("flex flex-col gap-3.5 p-3", className)}>
      {Array.from({ length: sections }).map((_, s) => (
        <div key={s} className="flex flex-col gap-1">
          <Skeleton className="mx-2 h-2.5 w-24" />
          {Array.from({ length: itemsPerSection }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5">
              <Skeleton rounded="md" className="h-4 w-4 shrink-0" />
              <Skeleton className="h-3" style={{ width: 96 + ((s + i) % 4) * 22 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonPage
 * Whole-module placeholder built from the parts above. `variant` picks the
 * shape that matches the module being loaded so the first paint is close to
 * the final layout.
 */
export function SkeletonPage({
  variant = "table",
  label = "Loading module",
  stats = 4,
  statsCols = 4,
  columns = 6,
  rows = 6,
  className,
}) {
  const header = (
    <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-end">
      <div className="flex max-w-3xl flex-col gap-2">
        <Skeleton className="h-2.5 w-40" />
        <Skeleton className="h-6 w-80 max-w-full" />
        <Skeleton className="h-3 w-full max-w-xl" />
      </div>
      <div className="flex flex-wrap items-center gap-space-xs">
        <SkeletonButton width={132} />
        <SkeletonButton width={116} />
      </div>
    </div>
  );

  return (
    <SkeletonRegion label={label} className={cn("flex w-full flex-col gap-space-xl pb-12", className)}>
      {header}

      {variant === "settings" ? (
        <div className="grid gap-space-lg lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SkeletonCard header={false}>
              <SkeletonList items={5} lines={1} />
            </SkeletonCard>
          </div>
          <div className="lg:col-span-8">
            <SkeletonCard>
              <SkeletonForm fields={4} columns={2} />
            </SkeletonCard>
          </div>
        </div>
      ) : (
        <>
          <SkeletonStatsGrid count={stats} cols={statsCols} progress />

          {variant === "dashboard" && (
            <div className="grid items-start gap-space-lg xl:grid-cols-12">
              <div className="flex flex-col gap-space-lg xl:col-span-8">
                <SkeletonCard>
                  <SkeletonChart />
                </SkeletonCard>
                <SkeletonTable rows={4} columns={6} />
              </div>
              <div className="flex flex-col gap-space-lg xl:col-span-4">
                <SkeletonCard lines={4} />
                <SkeletonCard header={false}>
                  <SkeletonList items={5} />
                </SkeletonCard>
              </div>
            </div>
          )}

          {variant === "analytics" && (
            <div className="grid gap-space-lg xl:grid-cols-12">
              <div className="xl:col-span-8">
                <SkeletonCard>
                  <SkeletonChart />
                </SkeletonCard>
              </div>
              <div className="xl:col-span-4">
                <SkeletonCard>
                  <SkeletonChart bars={5} height={200} legend={false} />
                </SkeletonCard>
              </div>
              <div className="xl:col-span-12">
                <SkeletonTable rows={rows} columns={columns} />
              </div>
            </div>
          )}

          {variant === "cards" && (
            <div className="grid gap-space-md sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} lines={3} footer />
              ))}
            </div>
          )}

          {variant === "split" && (
            <div className="grid items-start gap-space-lg xl:grid-cols-12">
              <div className="flex flex-col gap-space-md xl:col-span-8">
                <SkeletonToolbar />
                <SkeletonTable rows={rows} columns={columns} />
              </div>
              <div className="xl:col-span-4">
                <SkeletonCard lines={6} footer />
              </div>
            </div>
          )}

          {variant === "table" && (
            <>
              <SkeletonToolbar />
              <SkeletonTable rows={rows} columns={columns} />
            </>
          )}
        </>
      )}
    </SkeletonRegion>
  );
}
