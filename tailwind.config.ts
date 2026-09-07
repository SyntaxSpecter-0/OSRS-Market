import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // OSRS interface palette: oak-brown panels, a near-black recessed
        // background, and the game's signature orange/yellow/white text
        // hierarchy (orange for interface labels, yellow for gp amounts,
        // white for item names). Not Jagex's actual assets, just the same
        // color language.
        ledger: {
          bg: '#3e3529',
          panel: '#26211a',
          line: '#5a4a32',
          parchment: '#fff5e0',
          muted: '#a89878',
          bronze: '#ff981f',
        },
        buy: '#3ddc46',
        sell: '#ff3232',
        gp: '#ffff00',
      },
      fontFamily: {
        display: ['"MedievalSharp"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // A beveled inset border, the classic "old game GUI panel" look:
        // a light top-left edge and dark bottom-right edge on a dark panel.
        bevel: 'inset 1px 1px 0 rgba(255,255,255,0.12), inset -1px -1px 0 rgba(0,0,0,0.55)',
      },
    },
  },
  plugins: [],
};
export default config;
