/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
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
          DEFAULT: '#4A6A7C', // Main blue - AA on white (5.8:1) and on rb-blue-light (5:1)
          hover: '#3A5A6C', // Hover state - darker
          dark: '#2E4754',
        },
        // Purple accents
        'rb-purple': {
          light: '#E8E4F0',
          DEFAULT: '#B8A9C9',
        },
      },
      fontSize: {
        // Semantic type scale — prefer these (or the Typography components /
        // utility classes) over ad-hoc text-2xl/text-3xl so hierarchy stays
        // consistent across the app.
        'display': ['44px', { lineHeight: '1.05', fontWeight: '800' }],   // hero moments
        'heading-1': ['30px', { lineHeight: '1.2', fontWeight: '700' }],  // page titles
        'heading-2': ['24px', { lineHeight: '1.25', fontWeight: '700' }], // section titles
        'heading-3': ['20px', { lineHeight: '1.3', fontWeight: '600' }],  // subsections / card titles
        'heading-4': ['18px', { lineHeight: '1.35', fontWeight: '600' }], // small headings / labels
        'body-18': ['18px', { lineHeight: '1.5', fontWeight: '600' }],    // large body
        'body-16': ['16px', { lineHeight: '1.5', fontWeight: '400' }],    // default body
        'body-14': ['14px', { lineHeight: '1.5', fontWeight: '400' }],    // secondary body
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '500' }],    // captions / metadata
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
