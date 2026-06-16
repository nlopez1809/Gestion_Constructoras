/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        verde: {
          50:  '#f0f7eb',
          100: '#d9edcb',
          200: '#b3db97',
          300: '#8dc963',
          400: '#6ab73a',
          500: '#5a9e36',
          600: '#3d7a25',
          700: '#2d5a1b',
          800: '#1e3d12',
          900: '#0f1f09',
        },
        cafe: {
          50:  '#faf5f0',
          100: '#f0e0cc',
          200: '#d9b899',
          300: '#c29066',
          400: '#a0622e',
          500: '#7a4520',
          600: '#5c3317',
          700: '#3d220f',
          800: '#1f1108',
          900: '#0a0503',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        script: ['Dancing Script', 'cursive'],
      },
    },
  },
  plugins: [],
}
