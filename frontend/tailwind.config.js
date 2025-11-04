import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // ✅ tambahkan ekstensi React/TS
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
}
