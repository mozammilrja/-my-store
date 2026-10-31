/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Theme-reactive semantic surfaces
        "surface-canvas": "rgb(var(--surface-canvas) / <alpha-value>)",
        "surface-container-lowest": "rgb(var(--surface-container-lowest) / <alpha-value>)",
        "surface-container-low": "rgb(var(--surface-container-low) / <alpha-value>)",
        "surface-container": "rgb(var(--surface-container) / <alpha-value>)",
        "surface-container-high": "rgb(var(--surface-container-high) / <alpha-value>)",
        "surface-container-highest": "rgb(var(--surface-container-highest) / <alpha-value>)",
        "surface-subtle": "rgb(var(--surface-subtle) / <alpha-value>)",
        "surface": "rgb(var(--surface) / <alpha-value>)",
        "surface-bright": "rgb(var(--surface-bright) / <alpha-value>)",
        "surface-dim": "rgb(var(--surface-dim) / <alpha-value>)",
        "surface-variant": "rgb(var(--surface-variant) / <alpha-value>)",
        "background": "rgb(var(--background) / <alpha-value>)",

        // Theme-reactive borders
        "border-subtle": "rgb(var(--border-subtle) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        "border": "rgb(var(--border-subtle) / <alpha-value>)",

        // Theme-reactive typography & icons
        "text-primary": "rgb(var(--text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        "on-surface": "rgb(var(--on-surface) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--on-surface-variant) / <alpha-value>)",
        "on-background": "rgb(var(--on-background) / <alpha-value>)",
        "secondary": "rgb(var(--secondary) / <alpha-value>)",

        // Theme-reactive secondary surfaces & outlines
        "secondary-fixed": "rgb(var(--secondary-fixed) / <alpha-value>)",
        "secondary-fixed-dim": "rgb(var(--secondary-fixed-dim) / <alpha-value>)",
        "secondary-container": "rgb(var(--secondary-container) / <alpha-value>)",
        "on-secondary": "rgb(var(--on-secondary) / <alpha-value>)",
        "on-secondary-container": "rgb(var(--on-secondary-container) / <alpha-value>)",
        "on-secondary-fixed": "rgb(var(--on-secondary-fixed) / <alpha-value>)",
        "on-secondary-fixed-variant": "rgb(var(--on-secondary-fixed-variant) / <alpha-value>)",
        "outline": "rgb(var(--outline) / <alpha-value>)",
        "outline-variant": "rgb(var(--outline-variant) / <alpha-value>)",

        // Status pill backgrounds
        "status-success-bg": "rgb(var(--status-success-bg) / <alpha-value>)",
        "status-warning-bg": "rgb(var(--status-warning-bg) / <alpha-value>)",
        "status-danger-bg": "rgb(var(--status-danger-bg) / <alpha-value>)",
        "status-info-bg": "rgb(var(--status-info-bg) / <alpha-value>)",

        // Primary branding & accents
        "primary": "rgb(var(--primary) / <alpha-value>)",
        "primary-container": "rgb(var(--primary-container) / <alpha-value>)",
        "primary-fixed": "rgb(var(--primary-fixed) / <alpha-value>)",
        "primary-fixed-dim": "rgb(var(--primary-fixed-dim) / <alpha-value>)",
        "on-primary": "rgb(var(--on-primary) / <alpha-value>)",
        "on-primary-container": "rgb(var(--on-primary-container) / <alpha-value>)",
        "on-primary-fixed": "rgb(var(--on-primary-fixed) / <alpha-value>)",
        "on-primary-fixed-variant": "rgb(var(--on-primary-fixed-variant) / <alpha-value>)",
        "inverse-primary": "rgb(var(--inverse-primary) / <alpha-value>)",
        "inverse-surface": "rgb(var(--inverse-surface) / <alpha-value>)",
        "inverse-on-surface": "rgb(var(--inverse-on-surface) / <alpha-value>)",

        // Semantic status forecolors
        "status-danger": "#E11D48",
        "status-info": "#2563EB",
        "status-success": "#059669",
        "status-warning": "#D97706",
        "fashion-magenta": "#C026D3",

        // Tertiary accents
        "tertiary": "#5300b7",
        "tertiary-container": "#6d24de",
        "tertiary-fixed": "#eaddff",
        "tertiary-fixed-dim": "#d2bbff",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#dac6ff",
        "on-tertiary-fixed": "#25005a",
        "on-tertiary-fixed-variant": "#5a00c6",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "surface-tint": "#7331df"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "sm": "0.125rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
      spacing: {
        "gutter": "1rem",
        "space-sm": "0.5rem",
        "space-xs": "0.25rem",
        "margin-mobile": "1rem",
        "gutter-compact": "0.5rem",
        "margin": "1.5rem",
        "space-xl": "1.5rem",
        "space-md": "0.75rem",
        "space-lg": "1rem"
      },
      fontFamily: {
        "sans": ["Inter", "sans-serif"],
        "metric-stat": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-xs-caps": ["Inter", "sans-serif"],
        "display": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "headline-sm": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "table-cell-num": ["Inter", "sans-serif"],
        "headline-lg": ["Inter", "sans-serif"]
      },
      fontSize: {
        "metric-stat": ["28px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-xs-caps": ["11px", { lineHeight: "14px", letterSpacing: "0.06em", fontWeight: "600" }],
        "display": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "body-sm": ["13px", { lineHeight: "18px", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "headline-md": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-sm": ["16px", { lineHeight: "24px", letterSpacing: "-0.005em", fontWeight: "600" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "table-cell-num": ["13px", { lineHeight: "18px", letterSpacing: "0em", fontWeight: "500" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.015em", fontWeight: "600" }]
      }
    }
  },
  plugins: [],
}
