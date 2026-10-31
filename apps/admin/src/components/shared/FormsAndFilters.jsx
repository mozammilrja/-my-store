import React from 'react';
import { cn } from '../../lib/utils';
import { Icon, Input, Select, Button } from '../ui';

/**
 * SearchInput
 * Reusable search control with search icon, clear button, and optional keyboard shortcut badge.
 */
export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  shortcut,
  className,
  inputClassName,
  ...props
}) {
  const showClear = Boolean(value && String(value).length > 0 && onClear);

  return (
    <div className={cn("relative min-w-[200px] flex-1 sm:flex-initial", className)}>
      <Icon
        name="search"
        className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[16px] pointer-events-none"
      />
      <Input
        type="text"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange && onChange(e.target.value, e)}
        className={cn(
          "pl-8 pr-8 h-8.5 bg-surface-canvas text-xs transition-colors",
          showClear && "pr-8",
          shortcut && "pr-14",
          inputClassName
        )}
        {...props}
      />
      {showClear && (
        <button
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-secondary hover:text-text-primary rounded-full hover:bg-surface-subtle"
          title="Clear search"
          type="button"
        >
          <Icon name="close" className="material-symbols-outlined text-[14px]" />
        </button>
      )}
      {shortcut && !showClear && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center px-1.5 py-0.5 rounded bg-surface-subtle border border-border-subtle text-text-secondary text-[10px] font-mono pointer-events-none">
          {shortcut}
        </div>
      )}
    </div>
  );
}

/**
 * FilterDropdown
 * Styled dropdown selector designed specifically for table and list filters.
 */
export function FilterDropdown({
  value,
  onChange,
  options = [],
  placeholder = "Filter...",
  icon,
  className,
  ...props
}) {
  return (
    <div className={cn("relative inline-block", className)}>
      <Select
        value={value}
        onChange={(e) => onChange && onChange(e.target.value, e)}
        className="h-8.5 text-xs bg-surface-canvas font-medium min-w-[130px]"
        {...props}
      >
        {options.map((opt, idx) => {
          const val = typeof opt === "object" ? opt.value : opt;
          const label = typeof opt === "object" ? opt.label : opt;
          return (
            <option key={idx} value={val}>
              {label}
            </option>
          );
        })}
      </Select>
    </div>
  );
}

/**
 * DateRangeFilter
 * Segmented range toggle button group (e.g. 'Today', 'Yesterday', 'Last 7D', 'MTD').
 */
export function DateRangeFilter({
  ranges = ["Today", "Yesterday", "Last 7D", "MTD"],
  activeRange,
  onRangeChange,
  className,
}) {
  return (
    <div className={cn("flex items-center bg-surface-container-high p-1 rounded-xl shadow-xs border border-border-subtle/40", className)}>
      {ranges.map((range) => {
        const isActive = activeRange === range;
        return (
          <Button
            key={range}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onRangeChange && onRangeChange(range)}
            className={cn(
              "h-7 px-2.5 font-label-sm text-label-sm transition-all",
              isActive
                ? "bg-surface-container-lowest text-primary font-semibold shadow-xs hover:bg-surface-container-lowest"
                : "text-text-secondary hover:text-text-primary"
            )}
            type="button"
          >
            {range}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * FilterBar
 * Responsive bar wrapping status tabs, search input, filter selects and actions.
 */
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
        "p-space-sm bg-surface-container-lowest border border-border-subtle rounded-xl shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm",
        className
      )}
    >
      {/* Left: Status Filter Tabs */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          {tabs.map((tab) => {
            const tabId = typeof tab === "object" ? tab.id : tab;
            const tabLabel = typeof tab === "object" ? tab.label : tab;
            const count = typeof tab === "object" ? tab.count : undefined;
            const isActive = activeTab === tabId;

            return (
              <button
                key={tabId}
                onClick={() => onTabChange && onTabChange(tabId)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all flex items-center gap-1.5 whitespace-nowrap",
                  isActive
                    ? "bg-primary-container text-on-primary font-semibold shadow-xs"
                    : "bg-surface-subtle hover:bg-surface-container text-on-surface-variant"
                )}
                type="button"
              >
                <span>{tabLabel}</span>
                {count !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px]",
                      isActive ? "bg-white/20 text-white" : "bg-surface-container text-text-secondary"
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

      {/* Right: Search + Filter Dropdowns + Additional Actions */}
      <div className="flex flex-wrap items-center gap-space-xs">
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
 * Form control container providing accessible label, required indicator, helper text, and error validation messages.
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
  return (
    <div className={cn("space-y-1.5 w-full", className)} {...props}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="font-label-sm text-label-sm font-semibold text-text-primary flex items-center gap-1"
          >
            {label}
            {required && <span className="text-status-danger">*</span>}
          </label>
          {badge && (
            <span className="font-label-xs-caps text-[10px] text-text-secondary">
              {badge}
            </span>
          )}
        </div>
      )}

      {children}

      {error ? (
        <p className="text-[11px] text-status-danger font-medium flex items-center gap-1">
          <Icon name="error" className="material-symbols-outlined text-[13px]" />
          {error}
        </p>
      ) : (
        helperText && (
          <p className="text-[11px] text-text-secondary leading-normal">
            {helperText}
          </p>
        )
      )}
    </div>
  );
}

/**
 * FormSelect
 * Convenient wrapper integrating Select inside a FormField.
 */
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
    <FormField
      label={label}
      required={required}
      helperText={helperText}
      error={error}
      id={id}
      className={className}
    >
      <Select
        id={id}
        value={value}
        onChange={onChange}
        className={cn("h-9 bg-surface-container-lowest", error && "border-status-danger", selectClassName)}
        placeholder={placeholder}
        options={options}
        {...props}
      />
    </FormField>
  );
}

/**
 * FormTextarea
 * Styled multi-line input supporting dark mode, validation errors, and character counter.
 */
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
    <FormField
      label={label}
      required={required}
      helperText={helperText}
      error={error}
      id={id}
      className={className}
    >
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value ?? ""}
        onChange={(e) => onChange && onChange(e.target.value, e)}
        placeholder={placeholder}
        className={cn(
          "flex w-full rounded-lg border border-border-subtle bg-surface-container-lowest px-3 py-2 text-sm font-body-sm text-text-primary shadow-xs transition-colors placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-container disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-status-danger",
          textareaClassName
        )}
        {...props}
      />
      {maxLength && (
        <div className="text-right text-[10px] text-text-secondary">
          {String(value || "").length} / {maxLength}
        </div>
      )}
    </FormField>
  );
}
