import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#5E6AD2",
          hover: "#4F5ABF",
          light: "#ECEEFB",
        },
        success: "#2DA44E",
        warning: "#BF8700",
        danger: "#CF222E",
        border: "#E1E4E8",
        muted: "#656D76",
        "muted-foreground": "#424A53",
        surface: "#FFFFFF",
        bg: "#F6F8FA",
        sidebar: "#FFFFFF",
        text: "#1F2328",
        "chart-1": "#5E6AD2",
        "chart-2": "#BF8700",
        "chart-3": "#2DA44E",
        "chart-4": "#656D76",
      },
      borderRadius: {
        sm: "3px",
        md: "5px",
        lg: "6px",
        xl: "8px",
        "2xl": "10px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
        md: "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        lg: "0 4px 12px rgba(0,0,0,0.08)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-sans-jp)", "Hiragino Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
