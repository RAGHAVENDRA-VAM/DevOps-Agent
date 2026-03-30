/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        print: ['Times New Roman', 'Times', 'serif'],
      },
      colors: {
        primary: {
          light: '#3f51b5',
          DEFAULT: '#1a237e',
          dark: '#0d1333',
        },
        teal: {
          light: '#64ffda',
          DEFAULT: '#1de9b6',
          dark: '#00bfae',
        },
        gradientStart: '#f8fafc', // gray-50
        gradientMid: '#e3f2fd',   // blue-50
        gradientEnd: '#e8eaf6',   // indigo-50
      },
      backgroundImage: {
        'main-gradient': 'linear-gradient(135deg, #f8fafc 0%, #e3f2fd 50%, #e8eaf6 100%)',
        'header-gradient': 'linear-gradient(90deg, #1a237e 0%, #3f51b5 100%)',
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(31, 41, 55, 0.08)',
        button: '0 1px 3px 0 rgba(31, 41, 55, 0.12)',
      },
      borderRadius: {
        card: '1rem',
        button: '0.5rem',
      },
      transitionProperty: {
        'bg': 'background-color',
        'colors': 'color, background-color, border-color',
      },
    },
  },
  plugins: [],
}
