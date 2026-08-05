import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#059669",
        secondary: "#2563eb",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
