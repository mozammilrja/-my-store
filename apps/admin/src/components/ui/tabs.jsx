import React from "react";
import { cn } from "../../lib/utils";

export const Tabs = ({ className, value, onValueChange, children, ...props }) => {
  return (
    <div className={cn("w-full flex flex-col", className)} {...props}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, { activeValue: value, onValueChange });
      })}
    </div>
  );
};

export const TabsList = ({ className, activeValue, onValueChange, children, ...props }) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 overflow-x-auto border-b border-border-subtle bg-surface-subtle p-1",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          isActive: child.props.value === activeValue,
          onSelect: () => onValueChange && onValueChange(child.props.value),
        });
      })}
    </div>
  );
};

export const TabsTrigger = ({
  className,
  value,
  isActive,
  onSelect,
  children,
  ...props
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-surface-container-lowest font-semibold text-primary shadow-xs border-t-2 border-primary"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-container",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ className, value, activeValue, children, ...props }) => {
  if (value !== activeValue) return null;
  return (
    <div className={cn("mt-2 ring-offset-background focus-visible:outline-none", className)} {...props}>
      {children}
    </div>
  );
};
