import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#07111f',
          900: '#0a1628',
          800: '#10243d',
          700: '#173a61',
        },
        plasma: '#6cf0ff',
        comet: '#ffd166',
        nebula: '#ff6b9d',
        success: '#7dff9b',
      },
      boxShadow: {
        glow: '0 0 24px rgba(108, 240, 255, 0.35)',
      },
      fontFamily: {
        display: ['Verdana', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
