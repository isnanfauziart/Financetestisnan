/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin")

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (read from CSS vars defined in globals.css)
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-warm': 'var(--surface-warm)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        income: 'var(--income)',
        expense: 'var(--expense)',
        savings: 'var(--savings)',
        primary: 'var(--primary)',
        'primary-deep': 'var(--primary-deep)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        'hero-bg': 'var(--hero-bg)',
        'hero-mid': 'var(--hero-mid)',
        'hero-light': 'var(--hero-light)',

        // Earth (neutral / surface)
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
          950: '#2a2018',
        },
        // Cream (backgrounds)
        cream: {
          50: '#fefaf3',
          100: '#fdf6ea',
          200: '#f8ebd6',
        },
        // Sage (income / positive)
        sage: {
          50: '#f4f6ec',
          100: '#e6ebd0',
          200: '#cdd8a3',
          300: '#aebd7a',
          400: '#9aab78',
          500: '#7c8c5a',
          600: '#647348',
          700: '#4d5a36',
          main: '#7c8c5a',
          light: '#9aab78',
          deep: '#4d5a36',
        },
        // Clay (expense / warm)
        clay: {
          50: '#fbf0e9',
          100: '#f5d8c4',
          200: '#e8b59a',
          300: '#d99a7d',
          400: '#c47d5a',
          500: '#a36548',
          600: '#834e36',
          main: '#c47d5a',
          light: '#d99a7d',
          deep: '#834e36',
        },
        // Moss (savings / growth)
        moss: {
          50: '#ebf3f0',
          100: '#cfe2da',
          200: '#a5cabf',
          300: '#7aab9a',
          400: '#5b8c7a',
          500: '#3f6b5b',
          600: '#2e5043',
          main: '#5b8c7a',
          light: '#7aab9a',
          deep: '#2e5043',
        },
        // Violet (primary action)
        violet: {
          50: '#f3effc',
          100: '#e6dffb',
          200: '#d4c8f6',
          300: '#c4b5f4',
          400: '#b09fee',
          500: '#9f87ef',
          600: '#8c6fdb',
          700: '#7c5fcf',
          800: '#6349a8',
          900: '#4d3881',
          soft: '#c4b5f4',
          main: '#9f87ef',
          deep: '#7c5fcf',
        },
        // Amber (warning / highlight)
        amber: {
          50: '#fdf7e8',
          100: '#fae9b8',
          200: '#f4d27a',
          300: '#e8b94a',
          400: '#d4a853',
          500: '#b58a2e',
          main: '#d4a853',
          light: '#e8b94a',
        },
        // Rose (danger / accent)
        rose: {
          50: '#fbecec',
          100: '#f4c5c5',
          200: '#e89393',
          300: '#d96a6a',
          400: '#c44545',
          500: '#9e3030',
          main: '#c44545',
          light: '#d96a6a',
        },
        // Indigo (secondary action)
        indigo: {
          50: '#eef0fb',
          100: '#d4d9f3',
          200: '#a8b3e6',
          300: '#7c8ed9',
          400: '#5069cc',
          500: '#3a4fb3',
          main: '#5069cc',
          deep: '#3a4fb3',
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
        'bento-in': 'bentoIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'glow-pulse': 'glowPulse 2.4s ease-in-out infinite',
        'shimmer': 'shimmer 2.4s linear infinite',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'gradient-shift': 'gradientShift 8s ease infinite',
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
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(24px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        countIn: {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        bentoIn: {
          'from': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          'to': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scaleIn: {
          'from': { opacity: '0', transform: 'scale(0.92)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      boxShadow: {
        'warm': '0 4px 16px rgba(107,91,79,0.06)',
        'warm-lg': '0 8px 32px rgba(107,91,79,0.1)',
        'warm-xl': '0 16px 48px rgba(107,91,79,0.12)',
        'glass': '0 8px 32px rgba(61,48,39,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
        'inset-light': 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.04)',
        'pop': '0 12px 40px rgba(124,95,207,0.18)',
        'pop-lg': '0 20px 60px rgba(124,95,207,0.22)',
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '32px',
        '3xl': '48px',
      },
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant("can-hover", "@media (hover: hover) and (pointer: fine)")
    }),
  ],
}
