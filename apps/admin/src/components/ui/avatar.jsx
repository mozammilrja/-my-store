import React from "react";
import { cn } from "../../lib/utils";

export const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container ring-1 ring-border-subtle",
      className
    )}
    {...props}
  />
));
Avatar.displayName = "Avatar";

/** Falls back to whatever AvatarFallback renders underneath when the source fails. */
export const AvatarImage = React.forwardRef(({ className, alt = "", src, ...props }, ref) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  if (!src || failed) return null;
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("absolute inset-0 aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full text-label text-muted",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";
