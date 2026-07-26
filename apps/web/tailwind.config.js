/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0c1117",
          900: "#12181f",
          800: "#1a222d",
          700: "#243041",
        },
        mist: {
          100: "#e8eef6",
          200: "#c5d0de",
          400: "#7b8fa6",
        },
        signal: {
          ok: "#3dd68c",
          warn: "#f0b429",
          bad: "#f07178",
          info: "#5b9fd4",
        },
        accent: {
          DEFAULT: "#e8a87c",
          dim: "#c4895e",
        },
        meadow: {
          50: "#f4f6f2",
          100: "#e9eee6",
          700: "#2f5d3a",
          900: "#1a2218",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(232,174,124,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(232,174,124,0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "48px 48px",
      },
    },
  },
  plugins: [],
};
