import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Risk color scale
        "risk-low": "#22c55e",      // green-500
        "risk-medium": "#eab308",   // yellow-500
        "risk-high": "#f97316",     // orange-500
        "risk-critical": "#ef4444", // red-500
        // Cycle phase colors
        "cycle-expansion": "#3b82f6",   // blue-500
        "cycle-peak": "#a855f7",        // purple-500
        "cycle-contraction": "#f97316", // orange-500
        "cycle-trough": "#22c55e",      // green-500
      },
    },
  },
  plugins: [],
};

export default config;
