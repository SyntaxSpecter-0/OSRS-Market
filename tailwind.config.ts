import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Palette pulled from the GE interface itself: parchment ledger paper,
        // bronze rule lines, a mossy "buy" green and a rust "sell" red —
        // not a generic SaaS dashboard palette.
        ledger: {
          bg: '#1b1712',
          panel: '#241f19',
          line: '#3a3226',
          parchment: '#e8dcc2',
          muted: '#a89a7d',
          bronze: '#b08a4e',
        },
        buy: '#5c8a56',
        sell: '#a3503a',
      },
      fontFamily: {
        display: ['"IM Fell English"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
