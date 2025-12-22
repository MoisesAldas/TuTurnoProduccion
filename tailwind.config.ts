import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        bounce: "bounce 1s infinite",
        float: "float 4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-15px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.05)" },
        },
      },
      transitionDelay: {
        "400": "400ms",
        "1500": "1500ms",
        "2000": "2000ms",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        theme: {
          "50": "var(--theme-50)",
          "100": "var(--theme-100)",
          "200": "var(--theme-200)",
          "300": "var(--theme-300)",
          "400": "var(--theme-400)",
          "500": "var(--theme-500)",
          "600": "var(--theme-600)",
          "700": "var(--theme-700)",
          "800": "var(--theme-800)",
          "900": "var(--theme-900)",
          "950": "var(--theme-950)",
        },
        slate: {
          "850": "#1a202e",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Custom scrollbar plugin
    function ({ addUtilities }: any) {
      addUtilities({
        ".scrollbar-thin": {
          "scrollbar-width": "thin",
          "&::-webkit-scrollbar": {
            height: "6px",
            width: "6px",
          },
        },
        ".scrollbar-thumb-orange-200": {
          "&::-webkit-scrollbar-thumb": {
            "background-color": "#fed7aa",
            "border-radius": "3px",
          },
        },
        ".scrollbar-thumb-orange-300": {
          "&::-webkit-scrollbar-thumb": {
            "background-color": "#fdba74",
            "border-radius": "3px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            "background-color": "#fb923c",
          },
        },
        ".scrollbar-track-transparent": {
          "&::-webkit-scrollbar-track": {
            "background-color": "transparent",
          },
        },
        ".scrollbar-track-gray-100": {
          "&::-webkit-scrollbar-track": {
            "background-color": "#f3f4f6",
            "border-radius": "3px",
          },
        },
        ".hover\\:scrollbar-thumb-orange-300:hover": {
          "&::-webkit-scrollbar-thumb": {
            "background-color": "#fdba74",
          },
        },
      });
    },
  ],
};
export default config;
