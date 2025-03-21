/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      maxWidth: {
        '3xl': '48rem',
        '4xl': '56rem',
      },
    },
  },
  plugins: [],
}