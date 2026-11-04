import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * The plain text of an option label, which may be an element tree rather than
 * a string: the filter box has to match against what the eye reads.
 */
const nodeText = (node) => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (React.isValidElement(node)) return nodeText(node.props.children);
  return "";
};

const optionText = (item) => `${nodeText(item.label)} ${item.value ?? ""}`;

/**
 * Select
 * A themed popover select that keeps the native API surface: it accepts an
 * `options` array or <option> children and reports changes through either
 * `onChange` (event-shaped) or `onValueChange` (value only).
 * Height matches Input and Button so filter toolbars line up.
 *
 * A list long enough to scroll gets a filter box at the top of the popover,
 * because scrolling a few hundred SKUs to find one is not a way to pick it.
 * `searchable` forces that box on or off; left alone it appears once the list
 * passes `searchThreshold` options.
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
  searchable,
  searchThreshold = 10,
  searchPlaceholder = "Filter options...",
  name,
  id,
  "aria-label": ariaLabel,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const [internalValue, setInternalValue] = useState(value !== undefined ? value : defaultValue ?? "");
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const optionsRef = useRef(null);
  const searchRef = useRef(null);
  // The popover renders in a portal so no ancestor's `overflow: hidden` can
  // clip it. That means it needs the trigger's viewport rect to place itself.
  const [anchor, setAnchor] = useState(null);

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

  const showSearch = searchable ?? items.length > searchThreshold;
  const visibleItems = useMemo(() => {
    const q = showSearch ? query.trim().toLowerCase() : "";
    if (!q) return items;
    return items.filter((item) => optionText(item).toLowerCase().includes(q));
  }, [items, query, showSearch]);

  const handleSelect = useCallback(
    (itemValue) => {
      setInternalValue(itemValue);
      setIsOpen(false);
      onValueChange?.(itemValue);
      onChange?.({ target: { name, id, value: itemValue } });
    },
    [onValueChange, onChange, name, id]
  );

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width });
  }, []);

  const open = useCallback(() => {
    setQuery("");
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    measure();
    setIsOpen(true);
  }, [selectedIndex, measure]);

  const close = useCallback(({ restoreFocus = false } = {}) => {
    setIsOpen(false);
    if (restoreFocus) containerRef.current?.querySelector("button")?.focus();
  }, []);

  // Typing filters the list under the highlight, so move it back to the top.
  useEffect(() => {
    if (isOpen) setActiveIndex(visibleItems.length > 0 ? 0 : -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // The filter box takes focus so the first keystroke lands in it.
  useEffect(() => {
    if (isOpen && showSearch) searchRef.current?.focus();
  }, [isOpen, showSearch]);

  // Follow the trigger when the page or any scroll container moves under it.
  useEffect(() => {
    if (!isOpen) return undefined;
    const sync = () => measure();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [isOpen, measure]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (e) => {
      const inTrigger = containerRef.current?.contains(e.target);
      const inList = listRef.current?.contains(e.target);
      if (!inTrigger && !inList) setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    optionsRef.current?.children?.[activeIndex]?.scrollIntoView?.({ block: "nearest" });
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
      close({ restoreFocus: true });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(visibleItems.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(visibleItems.length - 1);
    } else if (e.key === "Enter" || (e.key === " " && !showSearch)) {
      // Space types a space in the filter box; only Enter commits there.
      e.preventDefault();
      const item = visibleItems[activeIndex];
      if (item && !item.disabled) handleSelect(item.value);
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  // Place the popover in viewport coordinates, flipping above the trigger when
  // there is not enough room below it.
  const MAX_POPOVER_H = showSearch ? 320 : 240; // matches max-h-60, plus the filter box
  const GAP = 6;
  let placement;
  if (anchor) {
    const below = window.innerHeight - anchor.bottom - GAP;
    const above = anchor.top - GAP;
    const flip = below < Math.min(MAX_POPOVER_H, above) && above > below;
    const width = Math.max(anchor.width, 176); // min-w-[11rem]
    const left = dropdownAlign === "right" ? Math.max(8, anchor.right - width) : Math.min(anchor.left, window.innerWidth - width - 8);
    placement = {
      left,
      width,
      maxHeight: Math.max(120, Math.min(MAX_POPOVER_H, flip ? above : below)),
      ...(flip ? { bottom: window.innerHeight - anchor.top + GAP } : { top: anchor.bottom + GAP }),
    };
  }

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

      {isOpen && anchor && createPortal(
        <div
          ref={listRef}
          role={showSearch ? "none" : "listbox"}
          aria-label={showSearch ? undefined : ariaLabel}
          style={placement}
          className={cn(
            "scrollbar-thin fixed z-overlay max-h-60 animate-zoom-in overflow-y-auto rounded-xl border border-subtle bg-overlay p-1.5 shadow-lg",
            showSearch && "flex flex-col overflow-hidden",
            dropdownClassName
          )}
        >
          {showSearch && (
            <div className="relative mb-1 shrink-0">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-faint"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                aria-label={ariaLabel ? `Filter ${ariaLabel}` : "Filter options"}
                className="h-8 w-full rounded-lg border border-subtle bg-surface-container-lowest pl-8 pr-2 text-meta text-primary placeholder:text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

          {/* Without the filter box this is `display: contents`, so the options
              stay direct children of the scrolling popover as before. */}
          <div
            ref={optionsRef}
            role={showSearch ? "listbox" : undefined}
            aria-label={showSearch ? ariaLabel : undefined}
            className={showSearch ? "scrollbar-thin -mr-1 min-h-0 flex-1 overflow-y-auto pr-1" : "contents"}
          >
            {visibleItems.length === 0 ? (
              <div className="px-3 py-2 text-center text-meta text-muted">
                {items.length === 0 ? "No options available" : "No options match that filter"}
              </div>
            ) : (
              visibleItems.map((item, idx) => {
                const isSelected = selectedItem !== undefined && item === selectedItem;
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
        </div>,
        document.body
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
