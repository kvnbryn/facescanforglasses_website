import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-kalam)", "cursive", "sans-serif"],
      },
      colors: {
        scan: {
          dark: "#060a08",
          panel: "#0a0f0d",
          emerald: "#34d399",
          teal: "#2dd4bf",
          cyan: "#22d3ee",
          glow: "rgba(52, 211, 153, 0.15)",
          border: "rgba(52, 211, 153, 0.12)",
        },
      },
      animation: {
        "rotate-slow": "rotateSlow 32s linear infinite",
        "rotate-slow-reverse": "rotateSlowReverse 46s linear infinite",
        "rotate-medium": "rotateSlow 20s linear infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "scan-line": "scanLine 3s linear infinite",
      },
      keyframes: {
        rotateSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        rotateSlowReverse: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(-360deg)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        scanLine: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;