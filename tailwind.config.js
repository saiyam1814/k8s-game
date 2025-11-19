/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        k8s: {
          blue: '#326CE5',
          dark: '#232F3E',
          light: '#FFFFFF',
        },
        neon: {
          blue: '#00f3ff',
          pink: '#ff00ff',
          green: '#00ff9d',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
