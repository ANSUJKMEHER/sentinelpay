/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Sans"', '"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        dark: {
          950: '#06070a',
          900: '#0a0c10',
          850: '#0f1217',
          800: '#141720',
          750: '#1a1e2a',
          700: '#212736',
        },
        sentinel: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          emerald: '#10b981',
          cyan: '#0ea5e9',
          indigo: '#6366f1',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.08em',
      },
      boxShadow: {
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.25)',
        'glow-cyan': '0 0 20px -5px rgba(14, 165, 233, 0.25)',
        'glow-amber': '0 0 20px -5px rgba(245, 158, 11, 0.25)',
        'hairline': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
};
