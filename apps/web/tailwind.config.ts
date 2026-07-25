import type { Config } from 'tailwindcss';

// Intercom design system tokens (source of truth: DESIGN.md at the repo root).
// Saans is proprietary; Inter (weight 500 for display) is the recommended free substitute,
// and JetBrains Mono substitutes SaansMono.
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
        // Intercom tokens (DESIGN.md -> colors)
        ink: {
          DEFAULT: '#111111',
          muted: '#626260',
          subtle: '#7b7b78',
          tertiary: '#9c9fa5',
        },
        canvas: '#f5f1ec',
        surface: {
          1: '#ffffff',
          2: '#ebe7e1',
        },
        inverse: {
          canvas: '#000000',
          surface: '#313130',
          ink: '#ffffff',
          'ink-muted': '#9c9fa5',
        },
        hairline: {
          DEFAULT: '#d3cec6',
          soft: '#ebe7e1',
        },
        // Fin Orange is the Fin AI product accent only — never a generic primary (DESIGN.md don'ts)
        fin: '#ff5600',
        brand: {
          blue: '#0007cb',
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
        // Escala Intercom (DESIGN.md -> rounded) — substitui a escala var-driven do shadcn.
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        xxl: '24px',
        pill: '9999px',
      },
      fontSize: {
        // Intercom typography scale (DESIGN.md -> typography)
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
        // DESIGN.md: a single family carries the hierarchy — display reuses the sans stack.
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
        // Intercom spacing tokens (DESIGN.md -> spacing), base unit 8px
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
