import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * The theme's type scale (--text-* in globals.css). tailwind-merge doesn't
 * know these, so it read `text-label-md` as a text *colour* and dropped the
 * real colour next to it (`text-on-primary` vanished, leaving dark text on a
 * black button). Registered as font sizes, both survive.
 */
const TYPE_SCALE = [
  "display-hero",
  "display-hero-mobile",
  "headline-xl",
  "headline-xl-mobile",
  "headline-lg",
  "headline-sm",
  "body-lg",
  "body-md",
  "body-sm",
  "label-caps",
  "label-md",
  "label-sm",
]

const twMerge = extendTailwindMerge({
  extend: { theme: { text: TYPE_SCALE } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
