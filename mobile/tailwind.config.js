/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Modern professional brand colors
        brand: {
          primary: '#0D47A1',      // Deep blue
          secondary: '#E8591E',    // Warm orange
          tertiary: '#4CAF50',     // Fresh green
          accent: '#FF6F00',       // Vibrant orange
        },
        ui: {
          // Surface colors - clean and bright
          canvas: '#FFFFFF',
          surface: '#F5F7FA',
          panel: '#FAFBFC',
          
          // Border and divider colors
          line: '#E0E6ED',
          lineStrong: '#D1D8E0',
          
          // Accent colors - professional tones
          accent: '#0D47A1',
          accentSoft: '#E3F2FD',
          accentMuted: '#BBDEFB',
          
          // Text colors with good contrast
          text: '#1A202C',
          textMuted: '#718096',
          textSoft: '#A0AEC0',
          
          // Status colors - semantic
          success: '#4CAF50',
          successSoft: '#E8F5E9',
          warning: '#FF6F00',
          warningLight: '#FFF3E0',
          error: '#D32F2F',
          errorSoft: '#FFEBEE',
          info: '#0D47A1',
          infoLight: '#E3F2FD',
        },
      },
    },
  },
  plugins: [],
};
