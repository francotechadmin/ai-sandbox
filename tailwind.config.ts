import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#12161b",
        panel: "#1a1f26",
        panel2: "#20262e",
        line: "#2b323b",
        text: "#e7eaee",
        muted: "#8b95a3",
        amber: "#e2a545",
        green: "#4fae76",
        red: "#d3654f",
      },
      fontFamily: {
        mono: ["SF Mono", "ui-monospace", "JetBrains Mono", "Menlo", "Consolas", "monospace"],
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Inter", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
