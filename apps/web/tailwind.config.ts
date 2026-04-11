import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#D97757",
          hover: "#C4653E",
        },
        success: "#4A7C59",
        warning: "#B5851A",
        danger: "#C0392B",
        border: "#E8E5E0",
        muted: "#6B6459",
        surface: "#FFFFFF",
        bg: "#FAF9F7",
        sidebar: "#F5F3F0",
        text: "#1a1715",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(30,20,10,0.06)",
        md: "0 2px 8px rgba(30,20,10,0.08)",
        lg: "0 4px 16px rgba(30,20,10,0.10)",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans JP", "Hiragino Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
