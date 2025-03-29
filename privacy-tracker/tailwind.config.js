/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'not-blue': '#3B82F6',
        'not-indigo': '#6366F1',
        'not-purple': '#8B5CF6',
      },
    },
  },
  plugins: [],
}; 