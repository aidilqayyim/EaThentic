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
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
      },
      backgroundSize: {
        '200%': '200% auto',
      },
    },
  },
  plugins: [],
}
