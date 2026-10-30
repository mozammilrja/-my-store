import { cn } from "@/lib/utils"

/**
 * Everwear monogram: an architectural tile with three knocked-out bars forming an "E",
 * the middle bar half-filled in the plum editorial accent.
 *
 * The tile takes `currentColor`, so it inverts with whatever surface it sits on.
 * Drawn as a single evenodd path rather than a mask so repeated instances need no ids.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="presentation"
      aria-hidden
      focusable="false"
      className={cn("size-8", className)}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4 0h24a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4Zm4.5 8.5h15v3.4h-15V8.5Zm0 5.8h15v3.4h-15v-3.4Zm0 5.8h15v3.4h-15v-3.4Z"
      />
      <path fill="var(--accent)" d="M8.5 14.3h9v3.4h-9z" />
    </svg>
  )
}
