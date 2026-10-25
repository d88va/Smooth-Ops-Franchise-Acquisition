/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter Variable"', 'system-ui', 'sans-serif'], display: ['"Space Grotesk Variable"', 'sans-serif'], mono: ['"JetBrains Mono"', 'monospace'] },
      colors: {
        ink: { 950: '#07090c', 900: '#0b0f14', 850: '#0f141b', 800: '#141b24', 700: '#1c2531', 600: '#2a3544', 500: '#3c4a5d' },
        amber: { brand: '#f5b942' },
        o: { approved: '#3ddc97', hold: '#f5b942', waitlist: '#5aa9ff', redirect: '#b583ff', decline: '#ff5d6c' },
      },
    },
  },
  plugins: [],
};
