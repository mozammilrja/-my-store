import { cn } from "@/lib/utils"

/** Page-width wrapper: full width with responsive side gutters. */
export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full px-margin-mobile md:px-margin", className)}
      {...props}
    />
  )
}
