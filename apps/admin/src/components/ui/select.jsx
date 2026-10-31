import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Select
 * A themed popover select that keeps the native API surface: it accepts an
 * `options` array or <option> children and reports changes through either
 * `onChange` (event-shaped) or `onValueChange` (value only).
 * Height matches Input and Button so filter toolbars line up.
 */
export const Select = React.forwardRef(({
  value,
  defaultValue,
  onChange,
  onValueChange,
  placeholder = "Select an option",
  options,
  children,
  className,
  dropdownClassName,
  dropdownAlign = "left",
  disabled = false,
  wrapperClassName,
  name,
  id,
  "aria-label": ariaLabel,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [internalValue, setInternalValue] = useState(value !== undefined ? value : defaultValue ?? "");
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (value !== undefined) setInternalValue(value);
  }, [value]);

  const items = useMemo(() => {
    if (options && Array.isArray(options)) {
      return options.map((opt) => (typeof opt === "object" && opt !== null ? opt : { value: opt, label: opt }));
    }
    const parsed = [];
    React.Children.forEach(children, (child) => {
      if (!child || !child.props) return;
      if (child.type === "option") {
        parsed.push({
          value: child.props.value !== undefined ? child.props.value : child.props.children,
          label: child.props.children,
          disabled: child.props.disabled,
        });
      } else if (child.props.value !== undefined) {
        parsed.push({
          value: child.props.value,
          label: child.props.children ?? child.props.label ?? child.props.value,
          disabled: child.props.disabled,
        });
      }
    });
    return parsed;
  }, [options, children]);

  const matchedIndex = items.findIndex((item) => String(item.value) === String(internalValue));
  // No match falls back to the first option, the behaviour the filter bars rely on.
  const selectedIndex = matchedIndex >= 0 ? matchedIndex : items.length > 0 ? 0 : -1;
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : undefined;
  const displayLabel = selectedItem ? selectedItem.label : placeholder;

  const handleSelect = useCallback(
    (itemValue) => {
      setInternalValue(itemValue);
      setIsOpen(false);
      onValueChange?.(itemValue);
      onChange?.({ target: { name, id, value: itemValue } });
    },
    [onValueChange, onChange, name, id]
  );

  const open = useCallback(() => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    listRef.current?.children?.[activeIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [isOpen, activeIndex]);

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item && !item.disabled) handleSelect(item.value);
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", wrapperClassName)}>
      <button
        ref={ref}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-9 w-full select-none items-center justify-between gap-2 rounded-lg border border-subtle bg-surface-container-lowest px-3 text-left text-body font-medium text-primary shadow-xs transition-colors hover:border-strong hover:bg-surface-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "border-primary ring-1 ring-ring",
          !selectedItem && "text-faint",
          className
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        {...props}
      >
        <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-faint transition-transform duration-200",
            isOpen && "rotate-180 text-accent"
          )}
        />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            "scrollbar-thin absolute top-full z-overlay mt-1.5 max-h-60 w-full min-w-[11rem] animate-zoom-in overflow-y-auto rounded-xl border border-subtle bg-overlay p-1.5 shadow-lg",
            dropdownAlign === "right" ? "right-0" : "left-0",
            dropdownClassName
          )}
        >
          {items.length === 0 ? (
            <div className="px-3 py-2 text-center text-meta text-muted">No options available</div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isActive = idx === activeIndex;
              return (
                <div
                  key={`${item.value}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => !item.disabled && handleSelect(item.value)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-meta font-medium outline-none transition-colors",
                    isSelected ? "text-accent" : "text-primary",
                    isActive && !item.disabled && "bg-surface-subtle",
                    item.disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  {isSelected && <Check aria-hidden="true" className="ml-2 size-4 shrink-0 text-accent" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
});

Select.displayName = "Select";

export const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center justify-between", className)} {...props}>
    {children}
  </div>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue = ({ placeholder, children }) => (
  <span className="truncate">{children || placeholder}</span>
);
SelectValue.displayName = "SelectValue";

export const SelectContent = ({ children, className }) => <div className={className}>{children}</div>;
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => (
  <option ref={ref} value={value} className={className} {...props}>
    {children}
  </option>
));
SelectItem.displayName = "SelectItem";
