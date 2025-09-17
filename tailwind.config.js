/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sage': {
          '50': '#f3f6f4',
          '100': '#e7ede9',
          '300': '#abc0b9',
          '500': '#608579',
          '700': '#435e56',
          '900': '#30413b',
        },
        'brand-orange': '#F97316',
      },
      boxShadow: {
        'glow': '0 4px 20px rgba(249, 115, 22, 0.25)',
      },
      fontFamily: {
        'sans': ['Arial', 'sans-serif'],
        'logo': ['"Inter"', 'sans-serif'],
        'serif-display': ['"Lora"', 'serif'],
        'nunito': ['"Nunito"', 'sans-serif'],
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'glow': 'box-shadow, transform',
        'blur': 'backdrop-filter, background-color',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(40px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-20px) translateX(10px)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: 0.7, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.1)' },
        },
        subtleGlow: {
          '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
          '50%': { opacity: 0.6, transform: 'scale(1.02)' },
        },
        fadeInStory: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeInDown: {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
        fadeIn: 'fadeIn 1.2s ease-out',
        fadeInUp: 'fadeInUp 0.8s ease-out',
        slideUp: 'slideUp 1s ease-out',
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 5s ease-in-out infinite',
        subtleGlow: 'subtleGlow 4s ease-in-out infinite',
        fadeInStory: 'fadeInStory 0.9s ease-out forwards',
        gradientShift: 'gradientShift 12s ease-in-out infinite',
        fadeInDown: 'fadeInDown 0.5s ease-out',
      },
      backgroundSize: {
        '200%': '200% auto',
      },
    },
  },
  plugins: [],
}
