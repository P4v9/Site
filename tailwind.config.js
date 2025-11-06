/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "ph-black": "#0b0b0b",
        "ph-gray": "#1a1a1a",
      },
    },
  },
  plugins: [],
}
