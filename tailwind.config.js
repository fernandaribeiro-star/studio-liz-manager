/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#6B46C1',
          800: '#3d2490',
          900: '#2d1b69',
        },
        gold: {
          400: '#d4b483',
          500: '#C9A96E',
          600: '#b8944a',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}
