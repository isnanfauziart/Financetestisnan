/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fdf8f3',
          100: '#f9ede0',
          200: '#f3dcc8',
        },
        violet: {
          soft: '#c4b5f4',
          main: '#9f87ef',
          deep: '#7c5fcf',
        },
        peach: {
          soft: '#f5c4a1',
          main: '#e8956d',
          deep: '#c96d43',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
