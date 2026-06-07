/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary, #0f172a)",
        secondary: "var(--color-secondary, #334155)",
        accent: "var(--color-accent, #3b82f6)",
        background: "var(--color-background, #f8fafc)",
        surface: "var(--color-surface, #ffffff)",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
