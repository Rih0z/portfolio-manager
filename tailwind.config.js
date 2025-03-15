/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0088FE',
          dark: '#0066CC',
          light: '#33AAFF',
        },
        accent: {
          DEFAULT: '#00C49F',
          dark: '#009B7D',
          light: '#33D0B1',
        },
        warning: {
          DEFAULT: '#FF0000',
          dark: '#CC0000',
          light: '#FF3333',
        },
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0)',
        'safe-top': 'env(safe-area-inset-top, 0)',
      },
    },
  },
  plugins: [],
}