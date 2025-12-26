import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'jam-bg': '#ffffff',
        'jam-surface': '#f9fafb',
        'jam-border': '#e5e7eb',
        'jam-claude': '#d97706',
        'jam-gemini': '#3b82f6',
        'jam-success': '#16a34a',
      },
    },
  },
  plugins: [],
}
export default config