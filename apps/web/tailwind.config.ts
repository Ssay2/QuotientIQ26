import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a111c",
        panel: "#101a2b",
        panelSoft: "#15233a",
        line: "#233a63",
        text: "#e8f0ff",
        textSoft: "#9cb2d4",
        accent: "#60a5fa",
        success: "#34d399",
        warning: "#f59e0b"
      }
    }
  },
  plugins: []
};

export default config;
