/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        sea: {
          950: '#061922',
          900: '#08202E',
          800: '#0B2C3D',
          700: '#0F3A4E',
          600: '#14506A',
        },
        mist: '#EAF0F2',
        coral: {
          50: '#FFF3EF',
          100: '#FFE3DA',
          200: '#FFC8B6',
          400: '#FF7A5C',
          500: '#FB5D3B',
          600: '#EA4A28',
          700: '#C93C1F',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(8,32,46,0.04), 0 8px 24px -12px rgba(8,32,46,0.18)',
      },
    },
  },
  plugins: [],
}
