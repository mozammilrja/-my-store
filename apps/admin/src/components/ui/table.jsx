import React from "react";
import { cn } from "../../lib/utils";

/**
 * Table
 * The scroll container lives here, so a wide table scrolls inside its own
 * panel instead of pushing the page sideways.
 */
export const Table = React.forwardRef(({ className, containerClassName, ...props }, ref) => (
  <div className={cn("scrollbar-thin relative w-full overflow-x-auto", containerClassName)}>
    <table
      ref={ref}
      className={cn("w-full caption-bottom border-collapse text-left text-body", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef(({ className, sticky = false, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-surface-subtle [&_tr]:border-b [&_tr]:border-subtle",
      sticky && "sticky top-0 z-10",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-subtle bg-surface-subtle font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

export const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-subtle transition-colors hover:bg-surface-subtle data-[state=selected]:bg-primary-fixed/40",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cn(
      "h-10 whitespace-nowrap px-3 text-left align-middle text-caption uppercase text-secondary [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-3 py-2.5 align-middle text-body [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-meta text-muted", className)} {...props} />
));
TableCaption.displayName = "TableCaption";
