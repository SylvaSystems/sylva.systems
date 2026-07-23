import type { Config } from "tailwindcss";

/*
  Tailwind configuration: where the design tokens become class names.

  content: which files Tailwind scans for class names. Only classes that
  actually appear in these files end up in the shipped CSS.

  The colors reference CSS variables defined in app/globals.css, so the
  palette is edited THERE (one place), and these entries just give each
  variable its class name (bg-paper, text-ink, border-rule, ...).
  "<alpha-value>" lets opacity shorthand work, e.g. bg-paper/95 = 95%.

  fontFamily.serif points at the variable created by next/font in
  layout.tsx, with Georgia as fallback while the font loads.

  maxWidth: two custom widths used across all pages -
    max-w-measure (42rem) = comfortable reading width for paragraphs,
    max-w-page (72rem)    = the overall content column.
*/
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--ink-soft) / <alpha-value>)",
        rule: "rgb(var(--rule) / <alpha-value>)",
        pine: "rgb(var(--pine) / <alpha-value>)",
        "pine-deep": "rgb(var(--pine-deep) / <alpha-value>)",
      },
      fontFamily: {
        serif: ["var(--font-latin-modern)", "Georgia", "serif"],
      },
      maxWidth: {
        measure: "42rem",
        page: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
