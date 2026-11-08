/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-orange': '#f2711c',
        'brand-orange-hover': '#d65e12',
        'brand-dark': '#333333',
        'brand-light': '#f8fafc',
      }
    },
  },
  plugins: [],
}

