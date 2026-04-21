import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        virtus: {
          red: "#C0392B",
          "red-dark": "#A33124",
          "red-light": "#D65446",
          yellow: "#E8C01A",
          "yellow-dark": "#C9A412",
          "yellow-light": "#F0D24D",
          dark: "#1a1a1a",
          "dark-800": "#232323",
          "dark-700": "#2d2d2d",
        },
        status: {
          green: "#16A34A",
          "green-bg": "#DCFCE7",
          yellow: "#CA8A04",
          "yellow-bg": "#FEF9C3",
          red: "#DC2626",
          "red-bg": "#FEE2E2",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
