import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The type scale and the text-colour scale both produce `text-*` classes.
 * tailwind-merge cannot tell `text-caption` (a size) from `text-muted` (a
 * colour) on its own, so it treated them as one group and dropped whichever
 * came first — which silently stripped sizes off table headers and the
 * foreground off every filled button. Declaring both groups fixes that.
 */
const FONT_SIZES = [
  "display", "title", "kpi", "kpi-sm", "heading", "subheading",
  "body-lg", "body", "num", "label-lg", "meta", "label", "micro", "caption",
  "icon-sm", "icon", "icon-md", "icon-lg", "icon-xl", "icon-2xl",
];

const TEXT_COLORS = [
  "primary", "secondary", "muted", "faint", "disabled",
  "accent", "accent-hover", "success", "warning", "danger", "info",
  "on-accent", "inverse",
];

const BORDER_COLORS = ["subtle", "emphasis", "strong", "accent", "success", "warning", "danger", "info"];

export const cn = (() => {
  const merge = extendTailwindMerge({
    override: {
      classGroups: {
        "font-size": [{ text: FONT_SIZES }],
        "text-color": [{ text: TEXT_COLORS }],
        "border-color": [{ border: BORDER_COLORS }],
      },
    },
  });
  return (...inputs) => merge(clsx(inputs));
})();
