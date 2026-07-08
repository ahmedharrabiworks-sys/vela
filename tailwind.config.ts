import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vela: {
          orange: "#FF6B35",
          rose: "#FF3366",
          night: "#1A0A00",
          cream: "#FFF5F0",
          muted: "#888888",
        },
        /* Theme-aware tokens — use in JIT classes like bg-vp/10, text-vp */
        vp: "rgb(var(--vp-rgb) / <alpha-value>)",
        va: "rgb(var(--va-rgb) / <alpha-value>)",
        vt: "var(--vt-color)",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "vela-gradient": "linear-gradient(135deg, #FF6B35, #FF3366)",
        "vela-gradient-r": "linear-gradient(135deg, #FF3366, #FF6B35)",
        "vela-glow": "radial-gradient(ellipse at center, rgba(255,107,53,0.3) 0%, transparent 70%)",
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "float-delayed": "float 3s ease-in-out 1s infinite",
        "float-delayed-2": "float 3s ease-in-out 2s infinite",
        "marquee": "marquee 30s linear infinite",
        "pulse-glow": "pulseGlow 4s ease-in-out infinite",
        "fade-up": "fadeUp 0.6s ease forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "vela": "0 0 40px rgba(255,107,53,0.25)",
        "vela-lg": "0 0 80px rgba(255,107,53,0.35)",
        "card": "0 4px 24px rgba(0,0,0,0.08)",
        "card-hover": "0 12px 48px rgba(0,0,0,0.14)",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
