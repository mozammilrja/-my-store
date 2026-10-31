import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardTitle, CardDescription, Badge, Progress, Icon } from '../ui';

/**
 * PageContainer
 * The single vertical rhythm every module sits on. The page padding and the
 * header offset belong to the app shell, not here.
 */
export function PageContainer({ className, children, ...props }) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-space-lg pb-8", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Breadcrumb
 * Separators are rendered, not typed, so a screen reader hears the trail
 * rather than a run of slashes.
 */
export function Breadcrumb({ items = [], className }) {
  const trail = Array.isArray(items)
    ? items
    : String(items ?? '')
        .split(/\s*[/\u2022\u203a>]\s*/)
        .filter(Boolean);
  return (
    <nav aria-label="Breadcrumb" className={cn("flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5", className)}>
      {trail.map((rawItem, idx) => {
        const isLast = idx === trail.length - 1;
        const item = typeof rawItem === "object" && rawItem !== null ? rawItem : { label: rawItem };
        return (
          <span key={idx} className="flex min-w-0 items-center gap-1.5">
            {idx > 0 && (
              <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-text-faint" />
            )}
            {item.href && !isLast ? (
              <a
                href={item.href}
                className="min-w-0 text-caption uppercase tracking-wider text-faint hover:text-primary transition-colors [overflow-wrap:anywhere]"
              >
                {item.label}
              </a>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={cn(
                  "min-w-0 text-caption uppercase tracking-wider [overflow-wrap:anywhere]",
                  isLast ? "font-semibold text-accent" : "text-faint"
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * PageHeader
 * Title and one-clause description on the left, actions on the right.
 * Actions wrap onto their own row below `lg` so nothing is pushed off screen.
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
    <div
      className={cn(
        "flex flex-col justify-between gap-space-md lg:flex-row lg:items-end",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 max-w-3xl flex-col gap-1">
        {(kicker || breadcrumb || badge) && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {breadcrumb ? (
              <Breadcrumb items={breadcrumb} />
            ) : (
              kicker && (
                <span className="truncate text-caption uppercase tracking-wider text-faint">
                  {kicker}
                </span>
              )
            )}
            {badge && (
              <Badge variant={badgeVariant} size="sm">
                {badge}
              </Badge>
            )}
          </div>
        )}

        <h1 className="text-title font-semibold tracking-tight text-primary">
          {title}
        </h1>

        {description && (
          <p className="text-body text-secondary">{description}</p>
        )}

        {children}
      </div>

      {actions && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:shrink-0">{actions}</div>
      )}
    </div>
  );
}

/**
 * PageSection
 * Section heading plus optional action, sitting above its own content.
 */
export function PageSection({ title, description, action, className, children, ...props }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-space-md", className)} {...props}>
      {(title || description || action) && (
        <div className="flex items-end justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title && (
              <h2 className="text-subheading font-semibold tracking-tight text-primary">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-body text-secondary">{description}</p>
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
 * Column counts above four only split that far on very wide screens; below
 * that they fall back to three, so a KPI label never has to be truncated.
 */
export function ContentGrid({ cols, columns, gap = "md", className, children, ...props }) {
  const count = Number(columns || cols || 4);
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
    4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6",
    7: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6",
    12: "grid-cols-1 md:grid-cols-12",
  }[count] || "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={cn("grid min-w-0", colClasses, gapClasses, className)} {...props}>
      {children}
    </div>
  );
}

const TREND_ALIASES = {
  positive: "up",
  increase: "up",
  up: "up",
  negative: "down",
  decrease: "down",
  down: "down",
  neutral: "neutral",
  warning: "warning",
};

/**
 * StatsCard
 * One KPI: label, value, an optional delta, then a footer line. Every card in
 * a row keeps the same minimum height so the grid never looks ragged, and the
 * label wraps to two lines rather than being cut mid-word.
 */
export function StatsCard({
  // `title`/`trend`/`subtext` are the canonical names; `label`/`change`/
  // `subtitle`/`changeType` are the aliases several modules were already
  // written against, whose values used to be dropped on the floor.
  title,
  label,
  value,
  trend,
  change,
  trendType = "up",
  changeType,
  trendLabel,
  subtitle,
  // An optional mark under the value: a sparkline, a meter. The tile stays a
  // figure — the chart is there for the shape, never to carry the number.
  visual,
  icon,
  iconColor = "text-accent",
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
  const heading = title ?? label;
  const delta = trend ?? change;
  const footnote = subtext ?? subtitle;
  const direction = TREND_ALIASES[changeType] || TREND_ALIASES[trendType] || "neutral";
  const trendVariant =
    direction === "up"
      ? "success"
      : direction === "down"
      ? "destructive"
      : direction === "warning"
      ? "warning"
      : "secondary";
  const hasFooter = progress !== undefined || Boolean(footnote) || Boolean(targetText);

  const content = (
    <>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 text-caption uppercase tracking-wider text-muted [overflow-wrap:anywhere]">
            {heading}
          </span>
          {icon && (
            <span className={cn("shrink-0 rounded-lg bg-surface-subtle p-1.5", iconColor)}>
              <Icon name={icon} className="material-symbols-outlined text-icon-md" />
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* Proportional figures: tabular digits give `121` the width of
              `000` and make a headline number look loose. Columns of numbers
              still align — they use tabular-nums where they sit in a table. */}
          <span className="text-kpi text-primary">{value}</span>
          {delta && (
            <Badge variant={trendVariant} size="sm" className="shrink-0">
              {direction === "up" && (
                <Icon name="trending_up" className="material-symbols-outlined text-icon-sm" />
              )}
              {direction === "down" && (
                <Icon name="trending_down" className="material-symbols-outlined text-icon-sm" />
              )}
              <span className="tabular-nums">{delta}</span>
            </Badge>
          )}
          {badge && !delta && (
            <Badge variant={badgeVariant} size="sm" className="shrink-0">
              {badge}
            </Badge>
          )}
        </div>

        {trendLabel && (
          <p className="truncate text-micro text-muted">{trendLabel}</p>
        )}

        {visual && <div className="mt-0.5 min-w-0">{visual}</div>}
      </div>

      {hasFooter && (
        <div className="mt-space-sm flex flex-col gap-1 border-t border-subtle pt-2">
          {progress !== undefined && (
            <>
              <div className="flex items-center justify-between gap-2 text-micro text-muted">
                <span className="truncate">{progressLabel || "Progress"}</span>
                <span className="shrink-0 font-semibold tabular-nums text-primary">
                  {targetText || `${progress}%`}
                </span>
              </div>
              <Progress value={progress} label={progressLabel || "Progress"} />
            </>
          )}
          {footnote && (
            <span className="block text-micro leading-snug text-muted">{footnote}</span>
          )}
        </div>
      )}
    </>
  );

  // Cards in a row share a height, so one with a footnote and one without used
  // to sit as a filled card beside a mostly empty one. Without a footer the
  // body centres in the card rather than hugging the top and leaving a void.
  const shell = cn(
    "flex min-h-[7.5rem] min-w-0 flex-col p-space-md transition-colors",
    hasFooter ? "justify-between" : "justify-center",
    isClickable &&
      "cursor-pointer text-left hover:border-strong hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas",
    className
  );

  if (isClickable) {
    return (
      <Card className={shell} onClick={onClick} role="button" tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(e);
          }
        }}
        {...props}
      >
        {content}
      </Card>
    );
  }

  return (
    <Card className={shell} {...props}>
      {content}
    </Card>
  );
}

/**
 * SectionCard
 * A bordered panel: optional header row, body, optional footer strip.
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
    <Card className={cn("flex min-w-0 flex-col overflow-hidden", className)} {...props}>
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-space-md border-b border-subtle p-space-md">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("min-w-0 flex-1 p-space-md", contentClassName)}>{children}</div>
      {footer && (
        <div className="border-t border-subtle bg-surface-subtle p-space-sm">{footer}</div>
      )}
    </Card>
  );
}

/**
 * Thumbnail
 * Product imagery comes from several sources and some rows have none. A
 * failed load falls back to a neutral tile rather than a broken-image glyph.
 */
export function Thumbnail({ src, alt = "", icon = "checkroom", className, imgClassName, ...props }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-subtle bg-surface-subtle text-faint",
        className
      )}
      {...props}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("h-full w-full object-cover", imgClassName)}
        />
      ) : (
        <Icon name={icon} aria-hidden="true" className="material-symbols-outlined text-icon-md" />
      )}
    </span>
  );
}

/**
 * ColorSwatch
 * A product colourway: the dot is painted from the record's own hex, which is
 * data rather than a theme token, and the code is shown beside it.
 */
export function ColorSwatch({ hex, name, className }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className="h-4 w-4 shrink-0 rounded-full border border-subtle shadow-xs"
        style={{ backgroundColor: hex }}
      />
      {name && <span className="truncate text-label-lg text-primary">{name}</span>}
      <span className="shrink-0 font-mono text-caption uppercase text-muted whitespace-nowrap">{hex}</span>
    </span>
  );
}
