/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // මේකෙන් තමයි Dark Mode එක Button එකකින් වැඩ කරන්න හදන්නේ
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // අපේම පාටවල් ටිකක් හදාගමු (REDA Brand Colors)
      colors: {
        primary: {
          light: '#1e3a8a', // තද නිල් (Light Mode)
          dark: '#3b82f6',  // දීප්තිමත් නිල් (Dark Mode)
        }
      }
    },
  },
  plugins: [],
}