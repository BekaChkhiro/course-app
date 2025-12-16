import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Navy Blue - #0e3355
        primary: {
          50: '#f0f5fa',
          100: '#dae5f1',
          200: '#b8cce3',
          300: '#8aacd0',
          400: '#5a88b8',
          500: '#3b6a9c',
          600: '#2d5280',
          700: '#1e3d63',
          800: '#142d4a',
          900: '#0e3355',
          950: '#091e33',
        },
        // Coral Red - #ff4d40
        accent: {
          50: '#fff5f4',
          100: '#ffe5e3',
          200: '#ffccc8',
          300: '#ffa9a2',
          400: '#ff7d72',
          500: '#ff4d40',
          600: '#ed3124',
          700: '#c82218',
          800: '#a52017',
          900: '#89211a',
          950: '#4b0c08',
        },
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
export default config
