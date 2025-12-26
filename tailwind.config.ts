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
        'jam-bg': '#0a0a0a',
        'jam-surface': '#141414',
        'jam-border': '#262626',
        'jam-claude': '#d97706',
        'jam-gemini': '#3b82f6',
        'jam-success': '#22c55e',
      },
    },
  },
  plugins: [],
}
export default config
