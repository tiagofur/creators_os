import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
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
        success: 'oklch(var(--color-success) / <alpha-value>)',
        warning: 'oklch(var(--color-warning) / <alpha-value>)',
        error: 'oklch(var(--color-error) / <alpha-value>)',
        info: 'oklch(var(--color-info) / <alpha-value>)',
        // Section colors
        ideas: 'oklch(var(--color-ideas) / <alpha-value>)',
        pipeline: 'oklch(var(--color-pipeline) / <alpha-value>)',
        studio: 'oklch(var(--color-studio) / <alpha-value>)',
        publishing: 'oklch(var(--color-publishing) / <alpha-value>)',
        analytics: 'oklch(var(--color-analytics) / <alpha-value>)',
        sponsorships: 'oklch(var(--color-sponsorships) / <alpha-value>)',
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
        full: 'var(--radius-full)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-from-right': {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in var(--duration-base, 200ms) ease-out',
        'slide-up': 'slide-up var(--duration-slow, 300ms) ease-out',
        'slide-in-right': 'slide-in-from-right var(--duration-slow, 300ms) ease-out',
        'scale-in': 'scale-in var(--duration-fast, 150ms) ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
