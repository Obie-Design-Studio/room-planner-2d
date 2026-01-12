import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        'bg-primary': '#FAFAFA',
        'bg-secondary': '#F5F5F5',
        'bg-elevated': '#FFFFFF',
        'text-primary': '#171717',
        'text-secondary': '#737373',
        'text-muted': '#A3A3A3',
        accent: {
          DEFAULT: '#0EA5E9',
          hover: '#0284C7',
        },
        border: '#E5E5E5',
      },
    },
  },
  plugins: [],
};

export default config;
