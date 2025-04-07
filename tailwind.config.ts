import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate"; // Import the plugin

const config: Config = {
  darkMode: "class",
  // content is automatically scanned in v4
  // content: [
  //   "./pages/**/*.{js,ts,jsx,tsx,mdx}", // remove if exists
  //   "./components/**/*.{js,ts,jsx,tsx,mdx}", // remove if exists
  //   "./app/**/*.{js,ts,jsx,tsx,mdx}", // remove if exists
  //   "./src/**/*.{js,ts,jsx,tsx,mdx}", // Add this if using src dir
  // ],
  theme: {
    // theme configuration remains similar
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Colors are defined as CSS variables in globals.css in v4
      // We reference them here if needed for shades or specific overrides,
      // but the primary definitions are in CSS.
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Activity type colors (can be defined here or directly used in components)
        // Let's define them here for easier reuse via Tailwind classes if needed
        activity: {
          web: "#4f46e5", // Indigo for web pages
          app: "#10b981", // Emerald for applications
          idle: "#94a3b8", // Slate for idle time
          other: "#8b5cf6", // Violet for other activities
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        // Keyframes definition remains the same
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        // Animation definition remains the same
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  // Use the imported plugin
  plugins: [animatePlugin],
};

export default config;
