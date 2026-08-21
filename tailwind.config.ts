import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00007F",
        secondary: "#2563eb",
        brand: {
          50: "#E6E6F2",
          100: "#C2C2E0",
          200: "#9999CC",
          300: "#7070B8",
          400: "#4747A3",
          500: "#1A1A94",
          600: "#00007F",
          700: "#00006B",
          800: "#000057",
          900: "#000042",
        },
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
