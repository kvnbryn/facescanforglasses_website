import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
        display: ["var(--font-space)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        paper: "#f4f2ec",
        ink: "#07101b",
        signal: { DEFAULT: "#ff7043", dark: "#b73b1b" },
        cobalt: "#315fdd",
        mint: "#a9e5c3",
        sand: "#e8e2d6",
      },
      opacity: {
        12: ".12",
        15: ".15",
        35: ".35",
        38: ".38",
        42: ".42",
        45: ".45",
        48: ".48",
        52: ".52",
        55: ".55",
        58: ".58",
        65: ".65",
        85: ".85",
      },
    },
  },
  plugins: [],
};

export default config;
