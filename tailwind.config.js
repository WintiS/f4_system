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
        // Brand accent — blue-leaning teal (from palette swatch #86E3CE), replaces old coral orange.
        coral: {
          50: '#EEF6FB',
          100: '#D6EAF6',
          200: '#A9D4EC',
          400: '#6FC0E0',
          500: '#2F8FC0',
          600: '#22729E',
          700: '#185880',
        },
        // ---- Lesson / course scheduling palette (pastel) ----
        // Each hue is a fill(500) / border(600) / deep-text(900) triad, plus a
        // 400 for hover. Cool = has instructor, warm = needs one.
        mint: { 400: '#9BEAD9', 500: '#86E3CE', 600: '#54C9B2', 900: '#07463B' }, // lesson · assigned
        sand: { 400: '#FFE7B0', 500: '#FFDD94', 600: '#F1C453', 900: '#6E4E0E' }, // lesson · unassigned
        lilac: { 400: '#D9BFE2', 500: '#CCABD8', 600: '#B187C6', 900: '#3E2A4F' }, // course · assigned
        salmon: { 400: '#FBA093', 500: '#FA897B', 600: '#EB6555', 900: '#611F16' }, // course · unassigned
        sprout: { 400: '#DCEBB8', 500: '#D0E6A5', 600: '#B2D177', 900: '#3B4A16' }, // rental
        wingteal: { 400: '#93E4E8', 500: '#6FD3DE', 600: '#43BECB', 900: '#06424A' }, // wing lesson · assigned (bluer than mint)
        winggreen: { 400: '#BBE3A8', 500: '#A8DA8C', 600: '#84C55F', 900: '#2E4A16' }, // wing course · assigned (greener than sprout)
      },
      boxShadow: {
        card: '0 1px 2px rgba(8,32,46,0.04), 0 8px 24px -12px rgba(8,32,46,0.18)',
      },
    },
  },
  plugins: [],
}
