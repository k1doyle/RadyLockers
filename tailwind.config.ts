import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#112b45',
          blue: '#1b4d7a',
          gold: '#c89b3c',
          mist: '#f5f7fb',
        },
      },
    },
  },
  plugins: [],
};

export default config;
