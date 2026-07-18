import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      boxShadow: { soft: "0 18px 45px rgba(21, 44, 37, 0.10)" },
    },
  },
  plugins: [],
};

export default config;