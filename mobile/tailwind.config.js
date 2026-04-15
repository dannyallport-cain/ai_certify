/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#BE0000',
        ui: {
          canvas: '#f8f5f1',
          surface: '#fffdf9',
          panel: '#f6f1eb',
          line: '#e6dbcf',
          lineStrong: '#e8ddd2',
          accent: '#7c5a45',
          accentSoft: '#efe6dc',
          accentMuted: '#e7d8c9',
          text: '#1f2937',
          textMuted: '#6b7280',
          textSoft: '#9b8d82',
          success: '#4f7a5c',
          successSoft: '#e4efe7',
          warning: '#f2c97d',
        },
      },
    },
  },
  plugins: [],
};
