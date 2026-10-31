import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Progress, Icon } from '../ui';

/**
 * PageContainer
 * Standard wrapper for all admin page modules ensuring consistent spacing, layout, and theme harmony.
 */
export function PageContainer({ className, children, ...props }) {
  return (
    <div className={cn("flex flex-col w-full space-y-space-xl pb-12", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * PageHeader
 * Unified, responsive header component for all 16 admin modules.
 * Standardizes kicker, breadcrumb, title, subtitle, status pills, and action toolbar.
 */
export function PageHeader({
  title,
  description,
  kicker,
  breadcrumb,
  badge,
  badgeVariant = "info",
  actions,
  className,
  children,
  ...props
}) {
  return (
    <div className={cn("flex flex-col lg:flex-row lg:items-end justify-between gap-space-md", className)} {...props}>
      <div className="space-y-1 max-w-3xl">
        {/* Kicker or Breadcrumb */}
        {(kicker || breadcrumb) && (
          <div className="flex items-center gap-2 font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider">
            {breadcrumb ? (
              Array.isArray(breadcrumb) ? (
                breadcrumb.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-secondary/40">/</span>}
                    <span className={idx === breadcrumb.length - 1 ? "text-primary font-semibold" : ""}>
                      {item}
                    </span>
                  </React.Fragment>
                ))
              ) : (
                <span>{breadcrumb}</span>
              )
            ) : (
              kicker && (
                <span className="text-primary uppercase font-bold tracking-widest">
                  {kicker}
                </span>
              )
            )}
            {badge && (
              <Badge variant={badgeVariant} className="ml-1 text-[10px] py-0 px-1.5 font-bold">
                {badge}
              </Badge>
            )}
          </div>
        )}

        {/* Title */}
        <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary tracking-tight">
          {title}
        </h1>

        {/* Description / Subtitle */}
        {description && (
          <p className="font-body-sm text-body-sm text-text-secondary">
            {description}
          </p>
        )}

        {children}
      </div>

      {/* Action Toolbar on the Right */}
      {actions && (
        <div className="flex flex-wrap items-center gap-space-xs shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * PageSection
 * Section container with optional title, description, and section-level actions.
 */
export function PageSection({
  title,
  description,
  action,
  className,
  children,
  ...props
}) {
  return (
    <section className={cn("space-y-space-md", className)} {...props}>
      {(title || description || action) && (
        <div className="flex items-center justify-between gap-space-sm pb-1">
          <div>
            {title && (
              <h2 className="font-headline-sm text-headline-sm font-semibold text-text-primary tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="font-body-sm text-body-sm text-text-secondary">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * ContentGrid
 * Responsive grid container supporting standard bento, columns, and custom configurations.
 */
export function ContentGrid({
  cols = 4,
  gap = "md",
  className,
  children,
  ...props
}) {
  const gapClasses = {
    xs: "gap-space-xs",
    sm: "gap-space-sm",
    md: "gap-space-md",
    lg: "gap-space-lg",
    xl: "gap-space-xl",
  }[gap] || "gap-space-md";

  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
    7: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7",
    12: "grid-cols-1 md:grid-cols-12",
  }[cols] || "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid", colClasses, gapClasses, className)} {...props}>
      {children}
    </div>
  );
}

/**
 * StatsCard
 * Standard KPI card across executive, sales, inventory, and finance modules.
 */
export function StatsCard({
  title,
  value,
  trend,
  trendType = "up", // 'up' | 'down' | 'neutral'
  trendLabel,
  icon,
  iconColor = "text-primary",
  progress,
  progressLabel,
  targetText,
  subtext,
  badge,
  badgeVariant = "info",
  className,
  onClick,
  ...props
}) {
  const isClickable = Boolean(onClick);

  return (
    <Card
      className={cn(
        "p-space-md flex flex-col justify-between group transition-all",
        isClickable && "cursor-pointer hover:shadow-md hover:border-border-strong",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="font-label-xs-caps text-label-xs-caps text-text-secondary uppercase tracking-wider font-semibold truncate">
            {title}
          </span>
          {icon && (
            <div className={cn("p-1.5 rounded-lg bg-surface-subtle", iconColor)}>
              <Icon name={icon} className="material-symbols-outlined text-[18px]" />
            </div>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2 mt-1.5">
          <span className="font-metric-stat text-metric-stat text-text-primary font-semibold tabular-nums">
            {value}
          </span>
          {trend && (
            <Badge
              variant={trendType === "up" ? "success" : trendType === "down" ? "destructive" : "secondary"}
              className="gap-0.5 text-[10px] py-0 shrink-0 font-medium"
            >
              {trendType === "up" && <Icon name="trending_up" className="material-symbols-outlined text-[13px]" />}
              {trendType === "down" && <Icon name="trending_down" className="material-symbols-outlined text-[13px]" />}
              <span>{trend}</span>
            </Badge>
          )}
          {badge && !trend && (
            <Badge variant={badgeVariant} className="text-[10px] py-0 shrink-0 font-medium">
              {badge}
            </Badge>
          )}
        </div>

        {trendLabel && (
          <p className="text-[11px] text-text-secondary mt-0.5 truncate">
            {trendLabel}
          </p>
        )}
      </div>

      {(progress !== undefined || subtext || targetText) && (
        <div className="mt-space-sm pt-2 border-t border-border-subtle/50">
          {progress !== undefined && (
            <div className="space-y-1 mb-1">
              <div className="flex justify-between font-label-xs-caps text-[10px] text-text-secondary">
                <span>{progressLabel || "Progress"}</span>
                <span className="font-semibold text-text-primary">{targetText || `${progress}%`}</span>
              </div>
              <Progress value={progress} className="h-1.5 bg-surface-subtle" />
            </div>
          )}
          {subtext && (
            <span className="text-[11px] text-text-secondary block truncate">
              {subtext}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * SectionCard
 * Standard container card with optional header, title, description, actions, and footer.
 */
export function SectionCard({
  title,
  description,
  action,
  footer,
  className,
  contentClassName,
  children,
  ...props
}) {
  return (
    <Card className={cn("overflow-hidden shadow-xs", className)} {...props}>
      {(title || description || action) && (
        <CardHeader className="flex flex-row items-center justify-between p-space-md border-b border-border-subtle/50">
          <div>
            {title && <CardTitle className="text-sm font-semibold">{title}</CardTitle>}
            {description && <CardDescription className="text-xs text-text-secondary mt-0.5">{description}</CardDescription>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("p-space-md", contentClassName)}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className="p-space-sm bg-surface-subtle border-t border-border-subtle/50">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
