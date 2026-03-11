import type { Config } from 'tailwindcss';

const baseConfig: Omit<Config, 'content'> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'oklch(var(--color-background) / <alpha-value>)',
        foreground: 'oklch(var(--color-foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'oklch(var(--color-primary) / <alpha-value>)',
          foreground: 'oklch(var(--color-primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'oklch(var(--color-secondary) / <alpha-value>)',
          foreground: 'oklch(var(--color-secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'oklch(var(--color-muted) / <alpha-value>)',
          foreground: 'oklch(var(--color-muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(var(--color-accent) / <alpha-value>)',
          foreground: 'oklch(var(--color-accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'oklch(var(--color-destructive) / <alpha-value>)',
          foreground: 'oklch(var(--color-destructive-foreground) / <alpha-value>)',
        },
        border: 'oklch(var(--color-border) / <alpha-value>)',
        ring: 'oklch(var(--color-ring) / <alpha-value>)',
        input: 'oklch(var(--color-input) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
};

export default baseConfig;
