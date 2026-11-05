import React from "react";
import { cn } from "../../lib/utils";

const TabsContext = React.createContext({ value: undefined, onValueChange: undefined });

export const Tabs = ({ className, value, onValueChange, children, ...props }) => {
  const ctx = React.useMemo(() => ({ value, onValueChange }), [value, onValueChange]);
  return (
    <TabsContext.Provider value={ctx}>
      <div className={cn("flex w-full flex-col", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ className, children, ...props }) => (
  <div
    role="tablist"
    className={cn(
      /*
       * overflow-y is explicitly hidden: setting only overflow-x makes the
       * browser resolve the other axis to auto, and the rail's content sat one
       * pixel taller than its box, which was enough to draw a vertical
       * scrollbar beside the tabs. A tab rail scrolls sideways or not at all.
       */
      "scrollbar-thin flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-subtle",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const TabsTrigger = ({ className, value, children, ...props }) => {
  const { value: active, onValueChange } = React.useContext(TabsContext);
  const isActive = value === active;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange?.(value)}
      className={cn(
        "-mb-px inline-flex h-9 items-center justify-center whitespace-nowrap border-b-2 px-3 text-label-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "border-primary font-semibold text-accent"
          : "border-transparent text-muted hover:border-strong hover:text-primary",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ className, value, children, ...props }) => {
  const { value: active } = React.useContext(TabsContext);
  if (value !== active) return null;
  return (
    <div role="tabpanel" className={cn("mt-space-md focus-visible:outline-none", className)} {...props}>
      {children}
    </div>
  );
};
