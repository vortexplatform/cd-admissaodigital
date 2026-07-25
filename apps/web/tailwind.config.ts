import type { Config } from 'tailwindcss';

// Design system tokens — paleta azul escuro profissional.
// Inter (weight 500 for display) para tipografia, JetBrains Mono para código.
const config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Tokens semanticos — paleta azul escuro
        ink: {
          DEFAULT: '#1b2a3d',
          muted: '#5e6b7a',
          subtle: '#7889a0',
          tertiary: '#8494a7',
        },
        canvas: '#f0f4f8',
        surface: {
          1: '#ffffff',
          2: '#e4eaf1',
        },
        inverse: {
          canvas: '#0f1520',
          surface: '#17223a',
          ink: '#ebeff4',
          'ink-muted': '#8494a7',
        },
        hairline: {
          DEFAULT: '#c8d1dc',
          soft: '#e4eaf1',
        },
        brand: {
          blue: '#1d4a8a',
        },
        report: {
          orange: '#fe4c02',
          blue: '#65b5ff',
          green: '#0bdf50',
          pink: '#ff2067',
          lime: '#b3e01c',
          cyan: '#03b2cb',
        },
        error: '#c41c1c',
        success: '#0bdf50',
      },
      borderRadius: {
        // Escala de border-radius
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        xxl: '24px',
        pill: '9999px',
      },
      fontSize: {
        // Escala tipográfica
        'display-xl': ['72px', { lineHeight: '1.05', letterSpacing: '-2px', fontWeight: '500' }],
        'display-lg': ['56px', { lineHeight: '1.10', letterSpacing: '-1.4px', fontWeight: '500' }],
        'display-md': ['40px', { lineHeight: '1.15', letterSpacing: '-0.8px', fontWeight: '500' }],
        headline: ['28px', { lineHeight: '1.20', letterSpacing: '-0.5px', fontWeight: '500' }],
        'card-title': ['22px', { lineHeight: '1.25', letterSpacing: '-0.3px', fontWeight: '500' }],
        subhead: ['20px', { lineHeight: '1.40', letterSpacing: '-0.2px', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.50', letterSpacing: '-0.1px', fontWeight: '400' }],
        body: ['16px', { lineHeight: '1.50', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.50', letterSpacing: '0', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.40', letterSpacing: '0', fontWeight: '400' }],
        button: ['15px', { lineHeight: '1.20', letterSpacing: '0', fontWeight: '500' }],
        eyebrow: ['14px', { lineHeight: '1.30', letterSpacing: '0', fontWeight: '500' }],
      },
      fontFamily: {
        sans: [
          'Saans',
          'Inter',
          'Saans Fallback',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        // Display reutiliza a mesma stack de fontes sans-serif.
        display: [
          'Saans',
          'Inter',
          'Saans Fallback',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: ['SaansMono', '"JetBrains Mono"', 'SaansMono Fallback', 'ui-monospace', 'monospace'],
      },
      spacing: {
        // Spacing tokens, base unit 8px
        section: '96px',
      },
      maxWidth: {
        content: '1280px',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
