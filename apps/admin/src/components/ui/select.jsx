import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * ReUI Custom Select Component
 * Replaces native browser OS <select> with a sleek Shadcn/ReUI styled floating popover dropdown.
 * Supports both compound component usage and standard options / <option> children.
 */

export const Select = React.forwardRef(({
  value,
  defaultValue,
  onChange,
  onValueChange,
  placeholder = "Select an option...",
  options,
  children,
  className,
  dropdownClassName,
  dropdownAlign = "left",
  disabled = false,
  name,
  id,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value !== undefined ? value : defaultValue || '');
  const containerRef = useRef(null);

  // Sync internal value if controlled
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Parse items from options prop or from children <option> elements
  const items = React.useMemo(() => {
    if (options && Array.isArray(options)) {
      return options.map(opt => typeof opt === 'object' ? opt : { value: opt, label: opt });
    }

    const parsed = [];
    React.Children.forEach(children, child => {
      if (!child) return;
      if (child.type === 'option') {
        parsed.push({
          value: child.props.value !== undefined ? child.props.value : child.props.children,
          label: child.props.children,
          disabled: child.props.disabled,
        });
      } else if (child.props && child.props.value !== undefined) {
        // Compound item
        parsed.push({
          value: child.props.value,
          label: child.props.children || child.props.label || child.props.value,
          disabled: child.props.disabled,
        });
      }
    });
    return parsed;
  }, [options, children]);

  // Current selected item
  const selectedItem = items.find(item => String(item.value) === String(internalValue)) || items[0];
  const displayLabel = selectedItem ? selectedItem.label : placeholder;

  // Handle select
  const handleSelect = (itemValue) => {
    setInternalValue(itemValue);
    setIsOpen(false);

    if (onValueChange) {
      onValueChange(itemValue);
    }
    if (onChange) {
      onChange({
        target: {
          name,
          id,
          value: itemValue,
        },
      });
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block w-full" id={id}>
      {/* Trigger Button */}
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1.5 text-xs font-medium text-text-primary shadow-xs transition-all hover:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary-container disabled:cursor-not-allowed disabled:opacity-50 select-none text-left",
          isOpen && "ring-1 ring-primary-container bg-surface-container-lowest border-primary-container",
          className
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        {...props}
      >
        <span className="truncate pr-2">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "size-4 text-text-secondary transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-primary-container"
          )}
        />
      </button>

      {/* Floating ReUI Menu Popover */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-1.5 z-50 w-full min-w-[200px] max-h-60 overflow-y-auto rounded-xl border border-border-subtle bg-surface-container-lowest p-1.5 shadow-xl transition-all animate-in fade-in-0 zoom-in-95",
            dropdownAlign === "right" ? "right-0" : "left-0",
            dropdownClassName
          )}
          role="listbox"
        >
          {items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary text-center">
              No options available
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = String(item.value) === String(internalValue);
              return (
                <div
                  key={idx}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => !item.disabled && handleSelect(item.value)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors outline-none",
                    isSelected
                      ? "bg-primary-fixed/40 text-primary-container font-semibold"
                      : "text-text-primary hover:bg-surface-subtle",
                    item.disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  {isSelected && (
                    <Check className="size-4 text-primary-container shrink-0 ml-2" />
                  )}
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

// Compound components for standard Shadcn / ReUI syntax
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

export const SelectContent = ({ children, className }) => (
  <div className={className}>{children}</div>
);
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => (
  <option ref={ref} value={value} className={className} {...props}>
    {children}
  </option>
));
SelectItem.displayName = "SelectItem";
