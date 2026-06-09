/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: '#0D1F3C', 50: '#E8EDF5' },
        teal:  { DEFAULT: '#028090' },
        rasoi: { DEFAULT: '#02C39A', dark: '#019978' },
        amber: { DEFAULT: '#D97706' },
        coral: { DEFAULT: '#DC2626' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
