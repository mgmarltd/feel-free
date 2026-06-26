import type { Config } from "tailwindcss";

// Mirrors the WatchOver dashboard design tokens.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef1ff",
          100: "#e0e5ff",
          200: "#c7cfff",
          300: "#a5b2ff",
          400: "#8090f8",
          500: "#5b6bf0",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
        },
        canvas: "#f6f7f9",
        line: "#ebedf0",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16,24,40,0.04), 0 1px 3px 0 rgba(16,24,40,0.06)",
        pop: "0 8px 24px -6px rgba(16,24,40,0.12)",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
