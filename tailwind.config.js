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
        earth: {
          50: '#fefaf5',
          100: '#f6efe5',
          200: '#ede0d0',
          300: '#d4c4b0',
          400: '#b8a590',
          500: '#9c8978',
          600: '#8c7b6a',
          700: '#6b5b4f',
          800: '#4a3d33',
          900: '#3d3027',
        },
        sage: {
          main: '#7c8c5a',
          light: '#9aab78',
        },
        clay: {
          main: '#c47d5a',
          light: '#d99a7d',
        },
        moss: {
          main: '#5b8c7a',
          light: '#7aab9a',
        },
        violet: {
          soft: '#c4b5f4',
          main: '#9f87ef',
          deep: '#7c5fcf',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'count-in': 'countIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        fadeInUp: {
          'from': { opacity: '0', transform: 'translateY(16px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideDown: {
          'from': { opacity: '0', transform: 'translateY(-16px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        countIn: {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'warm': '0 4px 16px rgba(107,91,79,0.06)',
        'warm-lg': '0 8px 32px rgba(107,91,79,0.1)',
        'warm-xl': '0 16px 48px rgba(107,91,79,0.12)',
      },
    },
  },
  plugins: [],
}