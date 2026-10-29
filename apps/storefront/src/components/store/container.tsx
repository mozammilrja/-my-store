import { cn } from "@/lib/utils"

/** Page-width wrapper: 1440px max with responsive side gutters. */
export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10", className)}
      {...props}
    />
  )
}
