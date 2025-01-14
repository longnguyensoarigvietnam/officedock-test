import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/providers/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    fontFamily: {
      primary: ['var(--font-primary)', 'sans-serif'],
      secondary: ['var(--font-primary)', 'sans-serif'],
    },
    extend: {
      colors: {
        ...colors,
        primary: '#0068B7',
        secondary: '#1D4ED8',
        success: '#ECFDF5',
        warning: '#FEF3C7',
        danger: '#FCA5A5',
        error: '#EF4444',
      },
      boxShadow: {
        common: '0px 0px 10px 1px #00000014',
        fullView: '0px 0px 14px 2px #0000001F;',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;
