import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-sora)', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#22c55e',
          dark: '#16a34a',
        },
        dark: {
          bg: '#1a1a1a',
          sidebar: '#111111',
          card: '#ffffff',
        },
      },
    },
  },
  plugins: [],
};

export default config;
