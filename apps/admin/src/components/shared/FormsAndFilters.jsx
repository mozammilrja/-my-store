import React from 'react';
import { cn } from '../../lib/utils';
import { Icon, Input, Textarea, Select } from '../ui';

/**
 * SearchInput
 * Search field with a leading icon, a clear button and an optional shortcut
 * hint. Height matches Select and Button so filter rows line up.
 */
export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search",
  shortcut,
  label,
  className,
  inputClassName,
  ...props
}) {
  const showClear = Boolean(value && String(value).length > 0 && onClear);

  return (
    <div className={cn("relative min-w-[13rem] flex-1 sm:flex-initial", className)}>
      <Icon
        name="search"
        aria-hidden="true"
        className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-icon text-faint"
      />
      <Input
        type="search"
        aria-label={label || placeholder}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange && onChange(e.target.value, e)}
        className={cn(
          "h-9 pl-8 text-meta [&::-webkit-search-cancel-button]:appearance-none",
          showClear ? "pr-8" : shortcut ? "pr-12" : "pr-3",
          inputClassName
        )}
        {...props}
      />
      {showClear && (
        <button
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-faint transition-colors hover:bg-surface-subtle hover:text-primary"
          title="Clear search"
          aria-label="Clear search"
          type="button"
        >
          <Icon name="close" className="material-symbols-outlined text-icon-sm" />
        </button>
      )}
      {shortcut && !showClear && (
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center rounded border border-subtle bg-surface-subtle px-1.5 py-0.5 text-micro text-muted sm:flex">
          {shortcut}
        </kbd>
      )}
    </div>
  );
}

/**
 * FilterDropdown
 * A Select sized for a filter toolbar.
 */
export function FilterDropdown({
  value,
  onChange,
  options = [],
  placeholder = "Filter",
  label,
  className,
  ...props
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange && onChange(e.target.value, e)}
      options={options}
      placeholder={placeholder}
      aria-label={label}
      wrapperClassName="w-auto"
      className={cn("h-9 w-auto min-w-[9rem] text-meta", className)}
      {...props}
    />
  );
}

/**
 * DateRangeFilter
 * Segmented control. The outer padding plus a 28px button keeps the whole
 * group at the same 36px as the controls beside it.
 */
export function DateRangeFilter({
  ranges = ["Today", "Yesterday", "Last 7D", "MTD"],
  activeRange,
  onRangeChange,
  label = "Date range",
  className,
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "scrollbar-thin flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-subtle bg-surface-subtle p-1",
        className
      )}
    >
      {ranges.map((range) => {
        const isActive = activeRange === range;
        return (
          <button
            key={range}
            type="button"
            aria-pressed={isActive}
            onClick={() => onRangeChange && onRangeChange(range)}
            className={cn(
              "h-7 whitespace-nowrap rounded-md px-2.5 text-label transition-colors",
              isActive
                ? "bg-surface-container-lowest font-semibold text-accent shadow-xs"
                : "text-muted hover:text-primary"
            )}
          >
            {range}
          </button>
        );
      })}
    </div>
  );
}

/**
 * FilterBar
 * Status pills on the left, search and filters on the right.
 */
const TAB_SCROLL_FADE = {
  maskImage: 'linear-gradient(to right, black calc(100% - 1.5rem), transparent)',
  WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 1.5rem), transparent)',
};

export function FilterBar({
  tabs = [],
  activeTab,
  onTabChange,
  search,
  filters,
  actions,
  className,
  children,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-stretch justify-between gap-space-sm rounded-xl border border-subtle bg-surface-container-lowest p-space-sm shadow-xs lg:flex-row lg:items-center",
        className
      )}
    >
      {tabs.length > 0 && (
        /* A tab clipped mid-word reads as broken, so the scroller fades at its
           right edge to say "there is more". */
        <div
          role="tablist"
          aria-label="Status filter"
          className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5 pr-2 lg:pb-0"
          style={TAB_SCROLL_FADE}
        >
          {tabs.map((tab) => {
            const tabId = typeof tab === "object" ? tab.id : tab;
            const tabLabel = typeof tab === "object" ? tab.label : tab;
            const count = typeof tab === "object" ? tab.count : undefined;
            const isActive = activeTab === tabId;

            return (
              <button
                key={tabId}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange && onTabChange(tabId)}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-label transition-colors",
                  isActive
                    ? "bg-primary-container font-semibold text-on-accent"
                    : "bg-surface-subtle text-muted hover:bg-surface-container hover:text-primary"
                )}
                type="button"
              >
                <span>{tabLabel}</span>
                {count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px text-micro tabular-nums",
                      isActive
                        ? "bg-scrim/25 text-on-accent"
                        : "bg-surface-container-high text-muted"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-space-xs">
        {search}
        {filters}
        {actions}
        {children}
      </div>
    </div>
  );
}

/**
 * FormField
 * Label, control, then either helper text or the validation message. The
 * message slot keeps its height so a field does not jump when it errors.
 */
export function FormField({
  label,
  required = false,
  badge,
  helperText,
  error,
  id,
  className,
  children,
  ...props
}) {
  const describedBy = error ? `${id || label}-error` : helperText ? `${id || label}-hint` : undefined;

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-1.5", className)} {...props}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={id}
            className="flex items-center gap-1 text-label font-medium text-primary"
          >
            {label}
            {required && (
              <span className="text-danger" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {badge && (
            <span className="text-micro text-muted">{badge}</span>
          )}
        </div>
      )}

      {children}

      {error ? (
        <p
          id={describedBy}
          className="flex items-center gap-1 text-micro text-danger"
        >
          <Icon name="error" aria-hidden="true" className="material-symbols-outlined text-icon-sm" />
          {error}
        </p>
      ) : (
        helperText && (
          <p id={describedBy} className="text-micro leading-normal text-muted">
            {helperText}
          </p>
        )
      )}
    </div>
  );
}

/** Input wrapped in a FormField, so a form row is one call. */
export function FormInput({ label, required, helperText, error, id, className, inputClassName, ...props }) {
  return (
    <FormField label={label} required={required} helperText={helperText} error={error} id={id} className={className}>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(error && "border-status-danger focus-visible:border-status-danger", inputClassName)}
        {...props}
      />
    </FormField>
  );
}

export function FormSelect({
  label,
  required,
  helperText,
  error,
  options = [],
  value,
  onChange,
  placeholder,
  className,
  selectClassName,
  id,
  ...props
}) {
  return (
    <FormField label={label} required={required} helperText={helperText} error={error} id={id} className={className}>
      <Select
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        options={options}
        aria-label={label}
        className={cn(error && "border-status-danger", selectClassName)}
        {...props}
      />
    </FormField>
  );
}

export function FormTextarea({
  label,
  required,
  helperText,
  error,
  value,
  onChange,
  rows = 3,
  maxLength,
  placeholder,
  className,
  textareaClassName,
  id,
  ...props
}) {
  return (
    <FormField label={label} required={required} helperText={helperText} error={error} id={id} className={className}>
      <Textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value ?? ""}
        onChange={(e) => onChange && onChange(e.target.value, e)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={cn(error && "border-status-danger focus-visible:border-status-danger", textareaClassName)}
        {...props}
      />
      {maxLength && (
        <div className="text-right text-micro tabular-nums text-muted">
          {String(value || "").length} / {maxLength}
        </div>
      )}
    </FormField>
  );
}

/** Groups fields on a consistent column grid. */
export function FormGrid({ columns = 2, className, children, ...props }) {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  }[columns] || "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("grid gap-space-md", colClass, className)} {...props}>
      {children}
    </div>
  );
}
