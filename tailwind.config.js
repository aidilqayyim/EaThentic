/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sage': {
          '50': '#f3f6f4',   // Lightest background
          '100': '#e7ede9',
          '300': '#abc0b9', // For subtle borders or highlights
          '500': '#608579',
          '700': '#435e56',  // Dark text color
          '900': '#30413b',
        },
        'brand-orange': '#F97316', // Main orange accent (Tailwind's orange-500)
      },
      boxShadow: {
        'glow': '0 4px 20px rgba(249, 115, 22, 0.25)',
      },
      fontFamily: {
        // Default font for body text 
        'sans': ['Arial', 'sans-serif'],
        // Font for logo
        'logo': ['"Inter"', 'sans-serif'],
        // Font for headlines or text
        'serif-display': ['"Lora"', 'serif'],
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'glow': 'box-shadow, transform',
        'blur': 'backdrop-filter, background-color', 
      },
    },
  },
  plugins: [],
}