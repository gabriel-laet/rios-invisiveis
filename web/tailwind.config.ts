import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4ede0",
        ink: "#1a1a1a",
        river: {
          natural: "#2d8fbb",
          open: "#8bb8d0",
          buried: "#c7506b",
          lake: "#3a9dc7",
        },
      },
      fontFamily: {
        serif: ["Georgia", "ui-serif", "serif"],
        sans: ["system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
