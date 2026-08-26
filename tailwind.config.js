/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          base: 'var(--fp-bg-base)',
          panel: 'var(--fp-bg-panel)',
          'panel-2': 'var(--fp-bg-panel-raised)',
          lime: 'var(--fp-lime)',
          'lime-light': 'var(--fp-lime-light)',
          violet: 'var(--fp-violet)',
          gold: 'var(--fp-lime)',
          'gold-strong': 'var(--fp-lime-light)',
          text: 'var(--fp-text-primary)',
          muted: 'var(--fp-text-muted)',
          border: 'var(--fp-border)',
          success: 'var(--fp-success)',
          danger: 'var(--fp-danger)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        xl: 'var(--radius-xl)',
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
      },
    },
  },
  plugins: [],
}

