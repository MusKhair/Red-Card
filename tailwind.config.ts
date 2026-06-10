import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: { 950: "#0A0C0A", 900: "#10140F", 800: "#181D16", 700: "#232A21", 500: "#3E4A3A" },
        chalk: { DEFAULT: "#F2F4EE", dim: "#A8B0A2" },
        booking: { DEFAULT: "#FFD60A", deep: "#E0B400" },
        sendoff: { DEFAULT: "#E5383B", deep: "#B32326" },
        grass: { DEFAULT: "#2DC653", deep: "#1F9C3F" }
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"]
      },
      keyframes: {
        cardflip: {
          "0%": { transform: "rotateY(90deg) scale(0.7)", opacity: "0" },
          "60%": { transform: "rotateY(-12deg) scale(1.04)", opacity: "1" },
          "100%": { transform: "rotateY(0deg) scale(1)", opacity: "1" }
        },
        risefade: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        }
      },
      animation: {
        cardflip: "cardflip 0.7s cubic-bezier(.2,.8,.3,1.1) both",
        risefade: "risefade 0.5s ease-out both"
      }
    }
  },
  plugins: []
} satisfies Config;
