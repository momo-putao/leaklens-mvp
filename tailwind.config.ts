import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        line: "#D7DEE8",
        panel: "#F6F8FB",
        brand: "#1E6F68",
        amber: "#B7791F",
        danger: "#B42318"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 32, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
