/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // This creates the class "font-sfpro"
        sfprobold: ['sfprobold', 'sans-serif'], 
        sfproreg: ['sfproregular', 'sans-serif'],
        sfproblackitalic: ['sfproblackitalic', 'sans-serif'],
        sfprolightitalic: ['sfprolightitalic', 'sans-serif'],
        sfproheavyitalic: ['sfproheavyitalic', 'sans-serif'],
        
        sfpromedium: ['sfpromedium', 'sans-serif'],
      },
    },
  },
  plugins: [],
}