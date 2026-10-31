import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Button, Icon } from '../ui';

/**
 * IconButton
 * Icon-only action. `title` doubles as the accessible name, so it is required
 * in practice: an unlabelled icon button is invisible to a screen reader.
 */
export function IconButton({
  icon,
  title,
  variant = "ghost",
  size = "iconSm",
  className,
  onClick,
  disabled = false,
  ...props
}) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn("shrink-0", className)}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      {...props}
    >
      <Icon name={icon} aria-hidden="true" className="material-symbols-outlined text-icon-md" />
    </Button>
  );
}

/**
 * Tooltip
 * Opens on hover and on focus, so the hint is reachable from the keyboard.
 */
export function Tooltip({ content, position = "top", children, className }) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  const posClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  }[position] || "bottom-full left-1/2 -translate-x-1/2 mb-1.5";

  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      aria-describedby={visible && content ? id : undefined}
    >
      {children}
      {visible && content && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-overlay animate-fade-in whitespace-nowrap rounded-md bg-inverse-surface px-2 py-1 text-micro text-inverse shadow-md",
            posClasses
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/**
 * DropdownMenu
 * Row and toolbar action menu. Closes on Escape, on an outside click and
 * after a choice; arrow keys walk the items.
 */
export function DropdownMenu({ trigger, align = "right", items = [], label = "Actions", className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef(null);
  const listRef = useRef(null);

  const actionable = items.filter((item) => !item.divider);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(actionable.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, actionable.length]);

  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      listRef.current?.querySelectorAll('[role="menuitem"]')?.[activeIndex]?.focus();
    }
  }, [isOpen, activeIndex]);

  let actionableIndex = -1;

  return (
    <div
      ref={menuRef}
      className="relative inline-block text-left"
      onClick={(e) => e.stopPropagation()}
    >
      <span
        onClick={() => {
          setActiveIndex(-1);
          setIsOpen((open) => !open);
        }}
      >
        {trigger || (
          <Button variant="ghost" size="iconSm" title={label} aria-label={label} aria-haspopup="menu" aria-expanded={isOpen}>
            <Icon name="more_vert" aria-hidden="true" className="material-symbols-outlined text-icon-md" />
          </Button>
        )}
      </span>

      {isOpen && (
        <div
          ref={listRef}
          role="menu"
          aria-label={label}
          className={cn(
            "absolute top-full z-overlay mt-1 min-w-[11rem] animate-zoom-in rounded-xl border border-subtle bg-overlay p-1.5 shadow-lg",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {items.map((item, idx) => {
            if (item.divider) {
              return <div key={idx} className="my-1 border-t border-subtle" role="separator" />;
            }
            actionableIndex += 1;

            return (
              <button
                key={idx}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick?.();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  item.danger
                    ? "text-danger hover:bg-status-danger-bg"
                    : "text-primary hover:bg-surface-subtle",
                  item.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                {item.icon && (
                  <Icon
                    name={item.icon}
                    aria-hidden="true"
                    className="material-symbols-outlined shrink-0 text-icon"
                  />
                )}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
