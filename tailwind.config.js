/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    borderRadius: { none: '0', DEFAULT: '0', sm: '2px', full: '9999px' },
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        cond: ['"IBM Plex Sans Condensed"', '"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      // Survey-sheet palette: tracing paper, drafting ink, plot-line grey, contour blue.
      colors: {
        paper: '#E8ECEA',
        sheet: '#F5F7F6',
        ink: '#17263A',
        soft: '#46576A',
        rule: '#B4BFBD',
        contour: '#3F5F80',
        // Okabe-Ito: distinguishable under the common kinds of colour blindness. Always paired with a shape.
        o: { approved: '#009E73', hold: '#E69F00', waitlist: '#0072B2', redirect: '#CC79A7', decline: '#D55E00' },
      },
    },
  },
  plugins: [],
};
