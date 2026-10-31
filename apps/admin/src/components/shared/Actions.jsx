import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Button, Icon } from '../ui';

/**
 * IconButton
 * Accessible, compact button designed specifically for iconography with title and active state.
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
      className={cn("text-secondary hover:text-text-primary shrink-0", className)}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      type="button"
      {...props}
    >
      <Icon name={icon} className="material-symbols-outlined text-[18px]" />
    </Button>
  );
}

/**
 * Tooltip
 * Accessible lightweight tooltip.
 */
export function Tooltip({ content, position = "top", children, className }) {
  const [visible, setVisible] = useState(false);

  const posClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  }[position] || "bottom-full left-1/2 -translate-x-1/2 mb-1.5";

  return (
    <div
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 px-2 py-1 rounded bg-black/90 text-white text-[11px] font-medium whitespace-nowrap shadow-md pointer-events-none animate-in fade-in-0 zoom-in-95",
            posClasses
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

/**
 * DropdownMenu
 * Accessible action dropdown menu for table row actions, quick settings, and secondary actions.
 */
export function DropdownMenu({
  trigger,
  align = "right",
  items = [], // array of { label, icon, onClick, danger, disabled, divider }
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <div onClick={() => setIsOpen((prev) => !prev)}>
        {trigger || (
          <Button variant="ghost" size="iconSm" type="button" title="Actions">
            <Icon name="more_vert" className="material-symbols-outlined text-[18px]" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border-subtle bg-surface-container-lowest p-1 shadow-xl animate-in fade-in-0 zoom-in-95",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {items.map((item, idx) => {
            if (item.divider) {
              return <div key={idx} className="my-1 border-t border-border-subtle/50" />;
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick && item.onClick();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left",
                  item.danger
                    ? "text-status-danger hover:bg-status-danger-bg/50"
                    : "text-text-primary hover:bg-surface-subtle",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {item.icon && (
                  <Icon name={item.icon} className="material-symbols-outlined text-[16px] shrink-0" />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
