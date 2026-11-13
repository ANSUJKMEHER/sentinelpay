/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        canvas: '#08090a',
        base: '#0c0d10',
        surface: {
          DEFAULT: '#111317',
          hover: '#16191f',
          active: '#1c2027',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.05)',
          medium: 'rgba(255, 255, 255, 0.08)',
          active: 'rgba(255, 255, 255, 0.14)',
        },
        subtle: {
          emerald: '#3fb950',
          amber: '#d29922',
          rose: '#f85149',
          indigo: '#5e6ad2',
          slate: '#8a8f98',
        },
      },
      letterSpacing: {
        tighter: '-0.035em',
        tight: '-0.02em',
        normal: '0',
        wide: '0.02em',
        wider: '0.04em',
        widest: '0.07em',
      },
    },
  },
  plugins: [],
};
