/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#173f35',
        leaf: '#9acb47',
        ink: '#202a27',
        mist: '#f4f6f3',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 8px 26px rgba(29, 48, 39, 0.06)' },
    },
  },
  plugins: [],
}
