/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'rb-dark': '#2D3436',
        'rb-gray': '#4A5568', // Updated for WCAG AA contrast (was #636E72)
        'rb-white': '#FFFFFF',
        // Blue color scale - WCAG AA compliant
        'rb-blue': {
          light: '#E8EEF2',
          DEFAULT: '#5A7A8C', // Main blue - WCAG AA compliant (was #7C9EB2)
          hover: '#4A6A7C', // Hover state - darker (was #6B8DA1)
          dark: '#3A5A6C',
        },
        // Purple accents
        'rb-purple': {
          light: '#E8E4F0',
          DEFAULT: '#B8A9C9',
        },
      },
      fontSize: {
        'heading-1': ['30px', { lineHeight: '1.2', fontWeight: '700' }],
        'body-16': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-18': ['18px', { lineHeight: '1.5', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}
