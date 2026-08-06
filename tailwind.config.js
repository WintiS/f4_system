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
        // ---- Lesson / course scheduling palette (pastel) ----
        // Each hue is a fill(500) / border(600) / deep-text(900) triad, plus a
        // 400 for hover. Cool = has instructor, warm = needs one.
        mint: { 400: '#9BEAD9', 500: '#86E3CE', 600: '#54C9B2', 900: '#07463B' }, // lesson · assigned
        sand: { 400: '#FFE7B0', 500: '#FFDD94', 600: '#F1C453', 900: '#6E4E0E' }, // lesson · unassigned
        lilac: { 400: '#D9BFE2', 500: '#CCABD8', 600: '#B187C6', 900: '#3E2A4F' }, // course · assigned
        salmon: { 400: '#FBA093', 500: '#FA897B', 600: '#EB6555', 900: '#611F16' }, // course · unassigned
        sprout: { 400: '#DCEBB8', 500: '#D0E6A5', 600: '#B2D177', 900: '#3B4A16' }, // rental
      },
      boxShadow: {
        card: '0 1px 2px rgba(8,32,46,0.04), 0 8px 24px -12px rgba(8,32,46,0.18)',
      },
    },
  },
  plugins: [],
}
