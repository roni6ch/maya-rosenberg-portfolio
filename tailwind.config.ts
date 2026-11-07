import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#0b0b0b', paper: '#f2f1ed', mist: '#8a8984', night: '#0a0b0e', bone: '#ece8df' },
      fontFamily: { sans: ['Jost Variable', 'system-ui', 'sans-serif'] },
      letterSpacing: { wider2: '0.28em' }
    }
  },
  plugins: []
}

export default config
