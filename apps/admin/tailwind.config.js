/** @type {import('tailwindcss').Config} */

/* Every colour resolves through a CSS custom property so a theme switch
   re-tints the whole UI without a reload and without any `dark:` pair. */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Surfaces
        "surface-canvas": token("surface-canvas"),
        "surface-container-lowest": token("surface-container-lowest"),
        "surface-container-low": token("surface-container-low"),
        "surface-container": token("surface-container"),
        "surface-container-high": token("surface-container-high"),
        "surface-container-highest": token("surface-container-highest"),
        "surface-subtle": token("surface-subtle"),
        "surface": token("surface"),
        "surface-bright": token("surface-bright"),
        "surface-dim": token("surface-dim"),
        "surface-variant": token("surface-variant"),
        "background": token("background"),
        "overlay": token("overlay"),
        "scrim": token("scrim"),

        // Borders
        "border-subtle": token("border-subtle"),
        "border-strong": token("border-strong"),
        "border-emphasis": token("border-emphasis"),
        "border": token("border-subtle"),
        "ring": token("ring"),

        // Typography and icons
        "text-primary": token("text-primary"),
        "text-secondary": token("text-secondary"),
        "text-faint": token("text-faint"),
        "on-surface": token("on-surface"),
        "on-surface-variant": token("on-surface-variant"),
        "on-background": token("on-background"),
        "secondary": token("secondary"),

        // Neutral containers and outlines
        "secondary-fixed": token("secondary-fixed"),
        "secondary-fixed-dim": token("secondary-fixed-dim"),
        "secondary-container": token("secondary-container"),
        "on-secondary": token("on-secondary"),
        "on-secondary-container": token("on-secondary-container"),
        "on-secondary-fixed": token("on-secondary-fixed"),
        "on-secondary-fixed-variant": token("on-secondary-fixed-variant"),
        "outline": token("outline"),
        "outline-variant": token("outline-variant"),

        // Brand accent: -primary tints text and icons, -primary-container fills
        "accent": token("text-accent"),
        "accent-hover": token("text-accent-hover"),
        "on-accent": token("text-on-accent"),
        "primary": token("primary"),
        "primary-hover": token("primary-hover"),
        "primary-container": token("primary-container"),
        "primary-container-hover": token("primary-container-hover"),
        "primary-fixed": token("primary-fixed"),
        "primary-fixed-dim": token("primary-fixed-dim"),
        "on-primary": token("on-primary"),
        "on-primary-container": token("on-primary-container"),
        "on-primary-fixed": token("on-primary-fixed"),
        "on-primary-fixed-variant": token("on-primary-fixed-variant"),
        "inverse-primary": token("inverse-primary"),
        "inverse-surface": token("inverse-surface"),
        "inverse-on-surface": token("inverse-on-surface"),

        // Status: a readable foreground plus the tint it sits on
        "status-success": token("status-success"),
        "status-success-bg": token("status-success-bg"),
        "status-warning": token("status-warning"),
        "status-warning-bg": token("status-warning-bg"),
        "status-danger": token("status-danger"),
        "status-danger-bg": token("status-danger-bg"),
        "status-info": token("status-info"),
        "status-info-bg": token("status-info-bg"),
        "status-success-solid": token("status-success-solid"),
        "status-warning-solid": token("status-warning-solid"),
        "status-danger-solid": token("status-danger-solid"),
        "status-info-solid": token("status-info-solid"),
        "on-status": token("on-status"),
        "error": token("status-danger"),
        "error-container": token("status-danger-bg"),
        "on-error": token("on-status"),
        "on-error-container": token("status-danger"),

        // Categorical identity, theme-paired so it stays readable in both
        "fashion-magenta": token("chart-4"),

        // Data visualisation
        "chart-1": token("chart-1"),
        "chart-2": token("chart-2"),
        "chart-3": token("chart-3"),
        "chart-4": token("chart-4"),
        "chart-5": token("chart-5"),
        "chart-grid": token("chart-grid"),
        "chart-baseline": token("chart-baseline"),
      },
      textColor: {
        "primary": token("text-primary"),
        "secondary": token("text-secondary"),
        "muted": token("text-muted"),
        "faint": token("text-faint"),
        "disabled": token("text-disabled"),
        "accent": token("text-accent"),
        "accent-hover": token("text-accent-hover"),
        "success": token("text-success"),
        "warning": token("text-warning"),
        "danger": token("text-danger"),
        "info": token("text-info"),
        "on-accent": token("text-on-accent"),
        "inverse": token("text-inverse")
      },
      borderColor: {
        "DEFAULT": token("border-subtle"),
        "subtle": token("border-subtle"),
        "emphasis": token("border-emphasis"),
        "strong": token("border-strong"),
        "accent": token("text-accent"),
        "success": token("status-success"),
        "warning": token("status-warning"),
        "danger": token("status-danger"),
        "info": token("status-info")
      },
      borderRadius: {
        "DEFAULT": "0.375rem",
        "sm": "0.25rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
      spacing: {
        // Named rungs the modules already use, kept pointing at the 4px ladder
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "0.75rem",
        "space-lg": "1rem",
        "space-xl": "1.5rem",
        "gutter": "1rem",
        "gutter-compact": "0.5rem",
        "margin": "1.5rem",
        "margin-mobile": "1rem",
        // Control heights the toolbars align on
        "8.5": "2.125rem",
        "13": "3.25rem",
        "30": "7.5rem",
        // App shell
        "header": "4rem",
        "sidebar": "17rem",
        "sidebar-collapsed": "4.5rem"
      },
      maxWidth: {
        "content": "100rem"
      },
      fontFamily: {
        // One UI family. `mono` is reserved for machine identifiers
        // (SKU, AWB, IRN, hashes), never for prose or numbers.
        "sans": ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        "mono": ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      fontSize: {
        // role            px   line-height   weight
        // The one figure a screen leads with. Sits above "display" because a
        // headline number is the subject here, not a label for one.
        "figure":    ["36px", { lineHeight: "40px", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display":   ["28px", { lineHeight: "34px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "title":     ["22px", { lineHeight: "28px", letterSpacing: "-0.015em", fontWeight: "600" }],
        "kpi":       ["24px", { lineHeight: "30px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "kpi-sm":    ["20px", { lineHeight: "26px", letterSpacing: "-0.015em", fontWeight: "600" }],
        "heading":   ["16px", { lineHeight: "22px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "subheading":["14px", { lineHeight: "20px", letterSpacing: "-0.005em", fontWeight: "600" }],
        "body-lg":   ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body":      ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "num":       ["13px", { lineHeight: "18px", fontWeight: "500" }],
        "label-lg":  ["13px", { lineHeight: "18px", fontWeight: "500" }],
        "meta":      ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label":     ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "micro":     ["11px", { lineHeight: "14px", fontWeight: "500" }],
        "caption":   ["11px", { lineHeight: "14px", letterSpacing: "0.04em", fontWeight: "600" }],
        // Icon glyph sizes. Material Symbols are a font, so they size here.
        "icon-sm":   ["14px", { lineHeight: "1" }],
        "icon":      ["16px", { lineHeight: "1" }],
        "icon-md":   ["18px", { lineHeight: "1" }],
        "icon-lg":   ["20px", { lineHeight: "1" }],
        "icon-xl":   ["24px", { lineHeight: "1" }],
        "icon-2xl":  ["32px", { lineHeight: "1" }]
      },
      boxShadow: {
        // One elevation family; the hue and strength come from the theme
        "xs": "0 1px 2px 0 rgb(var(--shadow-color) / var(--shadow-weak))",
        "sm": "0 1px 2px 0 rgb(var(--shadow-color) / var(--shadow-weak)), 0 1px 3px 0 rgb(var(--shadow-color) / var(--shadow-weak))",
        "DEFAULT": "0 1px 2px 0 rgb(var(--shadow-color) / var(--shadow-weak)), 0 1px 3px 0 rgb(var(--shadow-color) / var(--shadow-weak))",
        "md": "0 2px 4px -2px rgb(var(--shadow-color) / var(--shadow-weak)), 0 4px 8px -2px rgb(var(--shadow-color) / var(--shadow-mid))",
        "lg": "0 4px 6px -4px rgb(var(--shadow-color) / var(--shadow-weak)), 0 10px 15px -3px rgb(var(--shadow-color) / var(--shadow-mid))",
        "xl": "0 8px 10px -6px rgb(var(--shadow-color) / var(--shadow-mid)), 0 20px 25px -5px rgb(var(--shadow-color) / var(--shadow-mid))",
        "2xl": "0 25px 50px -12px rgb(var(--shadow-color) / var(--shadow-strong))",
        "none": "none"
      },
      backdropBlur: {
        "xs": "2px"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "zoom-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" }
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" }
        },
        "shimmer": {
          "100%": { transform: "translateX(100%)" }
        }
      },
      animation: {
        "fade-in": "fade-in 150ms cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in-up": "fade-in-up 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        "zoom-in": "zoom-in 150ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-from-right": "slide-in-from-right 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-from-bottom": "slide-in-from-bottom 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        "shimmer": "shimmer 1.6s infinite"
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.22, 1, 0.36, 1)"
      },
      zIndex: {
        "sidebar": "50",
        "header": "40",
        "overlay": "60"
      }
    }
  },
  plugins: [],
}
