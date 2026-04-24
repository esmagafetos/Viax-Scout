/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        "text-muted": "rgb(var(--text-muted) / <alpha-value>)",
        "text-faint": "rgb(var(--text-faint) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-dim": "rgb(var(--accent) / 0.12)",
        ok: "rgb(var(--ok) / <alpha-value>)",
        "ok-dim": "rgb(var(--ok) / 0.14)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border) / 0.18)",
      },
      fontFamily: {
        sans: ["Poppins_400Regular"],
        medium: ["Poppins_500Medium"],
        semibold: ["Poppins_600SemiBold"],
        bold: ["Poppins_700Bold"],
        extrabold: ["Poppins_800ExtraBold"],
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};
