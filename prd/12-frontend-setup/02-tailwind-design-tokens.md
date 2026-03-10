# Tailwind Config & Design Tokens Implementation

> Production-ready Tailwind configuration and CSS variables for Ordo Creator OS. Drop these files into your project and start building with design system tokens.

**Last Updated**: March 2026  
**Design System**: Ordo Foundations v1.0

---

## Overview

This guide provides COPY-PASTE ready code for implementing the Ordo design system in Tailwind CSS. Includes:

1. **globals.css** — All CSS custom properties (light + dark themes)
2. **tailwind.config.ts** — Complete Tailwind configuration
3. **cn() utility** — Class merging for dynamic styles
4. **Design token usage patterns** — How to use tokens in components
5. **Dark mode implementation** — Theme toggle with Zustand
6. **Font setup** — Inter with proper feature flags
7. **Monorepo preset** — Shared Tailwind config for web, mobile, desktop

---

## 1. CSS Variables (globals.css)

This file contains all color, spacing, typography, and animation tokens from the design system. Add this to your base stylesheet (typically `app/styles/globals.css`).

```css
/* ============================================================================
   Ordo Creator OS — Design System Tokens
   CSS Custom Properties for Light & Dark Themes
   ============================================================================ */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Light Theme (Default) */
:root {
  /* ─── Color Tokens ─────────────────────────────────────────────────── */
  /* Background & Foreground */
  --background: 0 0% 100%;           /* #FFFFFF */
  --foreground: 0 0% 4%;             /* #0A0A0B */
  --card: 0 0% 100%;                 /* #FFFFFF */
  --card-foreground: 0 0% 4%;        /* #0A0A0B */
  --popover: 0 0% 100%;              /* #FFFFFF */
  --popover-foreground: 0 0% 4%;     /* #0A0A0B */

  /* Primary Actions */
  --primary: 192 71% 50%;            /* #06B6D4 Cyan */
  --primary-foreground: 0 0% 100%;   /* #FFFFFF */

  /* Secondary Surfaces */
  --secondary: 192 100% 97%;         /* #ECFEFF */
  --secondary-foreground: 192 84% 35%;/* #0891B2 */

  /* Muted & Accent */
  --muted: 270 100% 96%;             /* #F5F3FF */
  --muted-foreground: 217 12% 42%;   /* #6B7280 */
  --accent: 270 100% 96%;            /* #F5F3FF */
  --accent-foreground: 268 85% 49%;  /* #7C3AED Purple */

  /* Destructive States */
  --destructive: 0 84% 60%;          /* #EF4444 */
  --destructive-foreground: 0 0% 100%; /* #FFFFFF */

  /* Borders & Inputs */
  --border: 220 13% 91%;             /* #E5E7EB */
  --input: 220 13% 91%;              /* #E5E7EB */
  --ring: 192 71% 50%;               /* #06B6D4 Cyan */

  /* Semantic Colors */
  --success: 142 71% 45%;            /* #10B981 Green */
  --warning: 38 92% 50%;             /* #F59E0B Amber */
  --error: 0 84% 60%;                /* #EF4444 Red */
  --info: 217 91% 60%;               /* #3B82F6 Blue */

  /* Section Colors (Sidebar Navigation) */
  --section-dashboard: 192 71% 50%;  /* #06B6D4 Cyan */
  --section-ideas: 280 100% 67%;     /* #8B5CF6 Violet */
  --section-pipeline: 325 100% 54%;  /* #EC4899 Pink */
  --section-workspaces: 25 95% 53%;  /* #F97316 Orange */
  --section-calendar: 217 91% 60%;   /* #3B82F6 Blue */
  --section-goals: 325 100% 54%;     /* #EC4899 Pink */
  --section-habits: 142 71% 45%;     /* #10B981 Green */
  --section-notes: 48 96% 53%;       /* #EAB308 Yellow */
  --section-wellbeing: 356 100% 54%; /* #F43F5E Rose */

  /* Status Colors */
  --status-todo-bg: 214 32% 91%;     /* #F3F4F6 */
  --status-todo-fg: 220 8% 21%;      /* #374151 */
  --status-todo-border: 220 14% 82%; /* #D1D5DB */

  --status-in-progress-bg: 213 96% 87%; /* #DBEAFE */
  --status-in-progress-fg: 217 100% 20%; /* #1E40AF */
  --status-in-progress-border: 213 100% 70%; /* #93C5FD */

  --status-completed-bg: 152 66% 92%; /* #D1FAE5 */
  --status-completed-fg: 168 100% 20%; /* #065F46 */
  --status-completed-border: 152 100% 74%; /* #6EE7B7 */

  --status-cancelled-bg: 214 32% 91%; /* #F3F4F6 */
  --status-cancelled-fg: 217 12% 42%; /* #6B7280 */
  --status-cancelled-border: 220 14% 82%; /* #D1D5DB */

  /* Priority Colors */
  --priority-low-bg: 217 100% 93%;    /* #DBEAFE */
  --priority-low-fg: 217 100% 20%;    /* #1E40AF */
  --priority-low-border: 217 100% 70%; /* #93C5FD */

  --priority-medium-bg: 45 93% 94%;   /* #FEF3C7 */
  --priority-medium-fg: 38 88% 29%;   /* #92400E */
  --priority-medium-border: 45 97% 82%; /* #FCD34D */

  --priority-high-bg: 0 93% 94%;      /* #FECACA */
  --priority-high-fg: 0 83% 30%;      /* #991B1B */
  --priority-high-border: 0 100% 75%; /* #F87171 */

  --priority-urgent-bg: 0 100% 75%;   /* #F87171 */
  --priority-urgent-fg: 0 0% 100%;    /* #FFFFFF */
  --priority-urgent-border: 0 84% 60%; /* #EF4444 */

  /* Timer Mode Colors */
  --timer-work-primary: 0 84% 60%;    /* #EF4444 Red */
  --timer-work-bg: 0 100% 97%;        /* #FEE2E2 */
  --timer-short-break: 142 76% 36%;   /* #22C55E Green */
  --timer-short-bg: 142 71% 92%;      /* #DCFCE7 */
  --timer-long-break: 217 91% 60%;    /* #3B82F6 Blue */
  --timer-long-bg: 213 96% 87%;       /* #DBEAFE */

  /* Tag Colors (10 Options) */
  --tag-red: 0 84% 60%;               /* #EF4444 */
  --tag-orange: 25 95% 53%;           /* #F97316 */
  --tag-amber: 38 92% 50%;            /* #F59E0B */
  --tag-lime: 84 85% 55%;             /* #84CC16 */
  --tag-green: 142 71% 45%;           /* #22C55E */
  --tag-teal: 170 97% 42%;            /* #14B8A6 */
  --tag-cyan: 192 71% 50%;            /* #06B6D4 */
  --tag-blue: 217 91% 60%;            /* #3B82F6 */
  --tag-violet: 280 100% 67%;         /* #8B5CF6 */
  --tag-pink: 325 100% 54%;           /* #EC4899 */

  /* Chart Colors */
  --chart-1: 25 95% 53%;              /* #F97316 Orange (Light) / #3B82F6 Blue (Dark) */
  --chart-2: 170 97% 42%;             /* #14B8A6 Teal (Light) / #10B981 Green (Dark) */
  --chart-3: 220 13% 34%;             /* #4B5563 Slate (Light) / #FACC15 Amber (Dark) */
  --chart-4: 48 96% 53%;              /* #FACC15 Amber (Light) / #A855F7 Purple (Dark) */
  --chart-5: 15 95% 55%;              /* #EA580C Deep Orange (Light) / #EF4444 Red (Dark) */

  /* ─── Spacing Tokens (4px base unit) ─────────────────────────────── */
  --spacing-0: 0px;
  --spacing-0-5: 2px;
  --spacing-1: 4px;
  --spacing-1-5: 6px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;
  --spacing-20: 80px;
  --spacing-24: 96px;

  /* ─── Border Radius ───────────────────────────────────────────────── */
  --radius: 12px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 18px;
  --radius-3xl: 24px;

  /* ─── Typography ──────────────────────────────────────────────────── */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
    'Helvetica Neue', sans-serif;
  --font-feature-settings: 'cv02' on, 'cv03' on, 'cv04' on, 'cv11' on;

  /* Display */
  --text-display-size: 48px;
  --text-display-weight: 700;
  --text-display-line-height: 1;
  --text-display-tracking: -0.025em;

  /* Heading 1 */
  --text-h1-size: 36px;
  --text-h1-weight: 700;
  --text-h1-line-height: 1.25;
  --text-h1-tracking: -0.025em;

  /* Heading 2 */
  --text-h2-size: 30px;
  --text-h2-weight: 600;
  --text-h2-line-height: 1.25;
  --text-h2-tracking: normal;

  /* Heading 3 */
  --text-h3-size: 24px;
  --text-h3-weight: 600;
  --text-h3-line-height: 1.25;
  --text-h3-tracking: normal;

  /* Heading 4 */
  --text-h4-size: 20px;
  --text-h4-weight: 600;
  --text-h4-line-height: 1.5;
  --text-h4-tracking: normal;

  /* Body Large */
  --text-body-lg-size: 18px;
  --text-body-lg-weight: 400;
  --text-body-lg-line-height: 1.5;
  --text-body-lg-tracking: normal;

  /* Body */
  --text-body-size: 16px;
  --text-body-weight: 400;
  --text-body-line-height: 1.5;
  --text-body-tracking: normal;

  /* Body Small */
  --text-body-sm-size: 14px;
  --text-body-sm-weight: 400;
  --text-body-sm-line-height: 1.5;
  --text-body-sm-tracking: normal;

  /* Caption */
  --text-caption-size: 12px;
  --text-caption-weight: 400;
  --text-caption-line-height: 1.5;
  --text-caption-tracking: normal;

  /* ─── Line Heights ────────────────────────────────────────────────── */
  --line-height-none: 1;
  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose: 2;

  /* ─── Animation ───────────────────────────────────────────────────── */
  --transition-fast: 100ms;
  --transition-normal: 200ms;
  --transition-slow: 300ms;
  --transition-slower: 500ms;

  /* ─── Utilities ───────────────────────────────────────────────────── */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
               0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
               0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Dark Theme */
.dark {
  /* Background & Foreground */
  --background: 260 13% 9%;           /* #0F0F14 */
  --foreground: 0 0% 98%;             /* #FAFAFA */
  --card: 260 14% 15%;                /* #1A1A24 */
  --card-foreground: 0 0% 98%;        /* #FAFAFA */
  --popover: 260 14% 15%;             /* #1A1A24 */
  --popover-foreground: 0 0% 98%;     /* #FAFAFA */

  /* Primary Actions */
  --primary: 192 93% 68%;             /* #22D3EE Cyan (lighter in dark) */
  --primary-foreground: 260 14% 15%;  /* #1A1A24 */

  /* Secondary Surfaces */
  --secondary: 260 5% 15%;            /* #27272A */
  --secondary-foreground: 0 0% 98%;   /* #FAFAFA */

  /* Muted & Accent */
  --muted: 260 5% 15%;                /* #27272A */
  --muted-foreground: 260 3% 63%;     /* #A1A1AA */
  --accent: 260 8% 25%;               /* #3F3F46 */
  --accent-foreground: 0 0% 98%;      /* #FAFAFA */

  /* Destructive States */
  --destructive: 0 89% 60%;           /* #DC2626 (darker in dark mode) */
  --destructive-foreground: 0 0% 98%; /* #FAFAFA */

  /* Borders & Inputs */
  --border: 260 5% 15%;               /* #27272A */
  --input: 260 5% 15%;                /* #27272A */
  --ring: 192 93% 68%;                /* #22D3EE Cyan */

  /* Semantic Colors */
  --success: 142 71% 45%;             /* #10B981 Green */
  --warning: 38 92% 50%;              /* #F59E0B Amber */
  --error: 0 89% 60%;                 /* #DC2626 Red */
  --info: 217 91% 60%;                /* #3B82F6 Blue */

  /* Section Colors (Same as light, may adjust for contrast) */
  --section-dashboard: 192 93% 68%;   /* #22D3EE Cyan (lighter) */
  --section-ideas: 280 100% 67%;      /* #8B5CF6 Violet */
  --section-pipeline: 325 100% 54%;   /* #EC4899 Pink */
  --section-workspaces: 25 95% 53%;   /* #F97316 Orange */
  --section-calendar: 217 91% 60%;    /* #3B82F6 Blue */
  --section-goals: 325 100% 54%;      /* #EC4899 Pink */
  --section-habits: 142 71% 45%;      /* #10B981 Green */
  --section-notes: 48 96% 53%;        /* #EAB308 Yellow */
  --section-wellbeing: 356 100% 54%;  /* #F43F5E Rose */

  /* Status Colors (Adjusted for dark mode) */
  --status-todo-bg: 220 13% 18%;      /* Dark gray */
  --status-todo-fg: 0 0% 98%;         /* Light text */
  --status-todo-border: 260 5% 25%;   /* Dark border */

  --status-in-progress-bg: 220 13% 22%; /* Slightly lighter */
  --status-in-progress-fg: 192 93% 68%; /* Cyan text */
  --status-in-progress-border: 220 13% 32%; /* Medium border */

  --status-completed-bg: 152 66% 25%; /* Dark green */
  --status-completed-fg: 152 100% 70%; /* Light green text */
  --status-completed-border: 152 66% 35%; /* Green border */

  --status-cancelled-bg: 220 13% 18%; /* Dark gray */
  --status-cancelled-fg: 260 3% 63%;  /* Muted text */
  --status-cancelled-border: 260 5% 25%; /* Dark border */

  /* Priority Colors (Adjusted for dark mode) */
  --priority-low-bg: 217 100% 28%;    /* Dark blue */
  --priority-low-fg: 217 100% 75%;    /* Light blue text */
  --priority-low-border: 217 100% 45%; /* Medium blue border */

  --priority-medium-bg: 45 93% 28%;   /* Dark amber */
  --priority-medium-fg: 45 97% 82%;   /* Light amber text */
  --priority-medium-border: 45 93% 50%; /* Medium amber border */

  --priority-high-bg: 0 84% 40%;      /* Dark red */
  --priority-high-fg: 0 100% 75%;     /* Light red text */
  --priority-high-border: 0 84% 50%;  /* Medium red border */

  --priority-urgent-bg: 0 89% 50%;    /* Bright red */
  --priority-urgent-fg: 0 0% 100%;    /* White text */
  --priority-urgent-border: 0 89% 60%; /* Red border */

  /* Timer Mode Colors */
  --timer-work-primary: 0 89% 60%;    /* #DC2626 Red */
  --timer-work-bg: 0 84% 25%;         /* Dark red bg */
  --timer-short-break: 142 71% 45%;   /* #10B981 Green */
  --timer-short-bg: 142 66% 25%;      /* Dark green bg */
  --timer-long-break: 217 91% 60%;    /* #3B82F6 Blue */
  --timer-long-bg: 217 100% 28%;      /* Dark blue bg */

  /* Tag Colors */
  --tag-red: 0 84% 60%;
  --tag-orange: 25 95% 53%;
  --tag-amber: 38 92% 50%;
  --tag-lime: 84 85% 55%;
  --tag-green: 142 71% 45%;
  --tag-teal: 170 97% 42%;
  --tag-cyan: 192 93% 68%;            /* Lighter in dark */
  --tag-blue: 217 91% 60%;
  --tag-violet: 280 100% 67%;
  --tag-pink: 325 100% 54%;

  /* Chart Colors (Dark Theme Variants) */
  --chart-1: 217 91% 60%;             /* Blue */
  --chart-2: 142 71% 45%;             /* Green */
  --chart-3: 48 96% 53%;              /* Amber */
  --chart-4: 268 85% 49%;             /* Purple */
  --chart-5: 0 84% 60%;               /* Red */
}

/* ============================================================================
   Global Base Styles
   ============================================================================ */

* {
  border-color: hsl(var(--border));
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: var(--font-family);
  font-feature-settings: var(--font-feature-settings);
  font-size: var(--text-body-size);
  font-weight: var(--text-body-weight);
  line-height: var(--text-body-line-height);
}

/* ─── Headings ────────────────────────────────────────────────────── */

.text-display,
h1.display {
  font-size: var(--text-display-size);
  font-weight: var(--text-display-weight);
  line-height: var(--text-display-line-height);
  letter-spacing: var(--text-display-tracking);
}

.text-h1,
h1 {
  font-size: var(--text-h1-size);
  font-weight: var(--text-h1-weight);
  line-height: var(--text-h1-line-height);
  letter-spacing: var(--text-h1-tracking);
}

.text-h2,
h2 {
  font-size: var(--text-h2-size);
  font-weight: var(--text-h2-weight);
  line-height: var(--text-h2-line-height);
  letter-spacing: var(--text-h2-tracking);
}

.text-h3,
h3 {
  font-size: var(--text-h3-size);
  font-weight: var(--text-h3-weight);
  line-height: var(--text-h3-line-height);
  letter-spacing: var(--text-h3-tracking);
}

.text-h4,
h4 {
  font-size: var(--text-h4-size);
  font-weight: var(--text-h4-weight);
  line-height: var(--text-h4-line-height);
  letter-spacing: var(--text-h4-tracking);
}

/* ─── Text Utilities ──────────────────────────────────────────────── */

.text-body-lg {
  font-size: var(--text-body-lg-size);
  font-weight: var(--text-body-lg-weight);
  line-height: var(--text-body-lg-line-height);
  letter-spacing: var(--text-body-lg-tracking);
}

.text-body {
  font-size: var(--text-body-size);
  font-weight: var(--text-body-weight);
  line-height: var(--text-body-line-height);
  letter-spacing: var(--text-body-tracking);
}

.text-body-sm {
  font-size: var(--text-body-sm-size);
  font-weight: var(--text-body-sm-weight);
  line-height: var(--text-body-sm-line-height);
  letter-spacing: var(--text-body-sm-tracking);
}

.text-caption {
  font-size: var(--text-caption-size);
  font-weight: var(--text-caption-weight);
  line-height: var(--text-caption-line-height);
  letter-spacing: var(--text-caption-tracking);
  color: hsl(var(--muted-foreground));
}

/* ─── Links ───────────────────────────────────────────────────────── */

a {
  color: hsl(var(--primary));
  text-decoration: none;
  transition: color var(--transition-fast);
}

a:hover {
  text-decoration: underline;
}

a:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: 2px;
}

/* ─── Focus States ────────────────────────────────────────────────── */

*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* ─── Reduced Motion ──────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* ─── High Contrast Mode ──────────────────────────────────────────── */

@media (prefers-contrast: more) {
  :root {
    --border: 0 0% 0%;
  }

  .dark {
    --border: 0 0% 100%;
  }
}

/* ============================================================================
   Animation Definitions
   ============================================================================ */

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

@keyframes wiggle {
  0%,
  100% {
    transform: rotate(-1deg);
  }
  50% {
    transform: rotate(1deg);
  }
}

@keyframes fadeInOut {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes sparkle {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

@keyframes lift {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-4px);
  }
}

@keyframes scaleIn {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes slideInRight {
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideInLeft {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  0% {
    transform: translateY(16px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulseGlow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

@keyframes progressFill {
  0% {
    transform: scaleX(0);
    transform-origin: left;
  }
  100% {
    transform: scaleX(1);
  }
}

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

@keyframes confetti {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
    opacity: 0;
  }
}

/* ─── Animation Utility Classes ───────────────────────────────────── */

.animate-float {
  animation: float 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animate-wiggle {
  animation: wiggle 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animate-fadeInOut {
  animation: fadeInOut 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animate-sparkle {
  animation: sparkle 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animate-lift {
  animation: lift 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-scaleIn {
  animation: scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-slideInRight {
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-slideInLeft {
  animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-fadeInUp {
  animation: fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-pulseGlow {
  animation: pulseGlow 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animate-progressFill {
  animation: progressFill 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-shimmer {
  animation: shimmer 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  background-size: 1000px 100%;
}

.animate-confetti {
  animation: confetti 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* ============================================================================
   @tailwind Directives
   ============================================================================ */

@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 2. Tailwind Configuration (tailwind.config.ts)

Create `tailwind.config.ts` in the root of your project:

```typescript
import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: 'class',
  content: [
    // Web app
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',

    // Shared UI package (monorepo)
    './packages/ui-shared/**/*.{js,ts,jsx,tsx}',
    './packages/ui-components/**/*.{js,ts,jsx,tsx}',

    // Mobile (NativeWind)
    './apps/mobile/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      /* ─── Colors ───────────────────────────────────────────────── */
      colors: {
        // Core colors from design system
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
        popover: 'hsl(var(--popover) / <alpha-value>)',
        'popover-foreground':
          'hsl(var(--popover-foreground) / <alpha-value>)',
        primary: 'hsl(var(--primary) / <alpha-value>)',
        'primary-foreground':
          'hsl(var(--primary-foreground) / <alpha-value>)',
        secondary: 'hsl(var(--secondary) / <alpha-value>)',
        'secondary-foreground':
          'hsl(var(--secondary-foreground) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground':
          'hsl(var(--muted-foreground) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'accent-foreground':
          'hsl(var(--accent-foreground) / <alpha-value>)',
        destructive: 'hsl(var(--destructive) / <alpha-value>)',
        'destructive-foreground':
          'hsl(var(--destructive-foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',

        // Semantic colors
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        error: 'hsl(var(--error) / <alpha-value>)',
        info: 'hsl(var(--info) / <alpha-value>)',

        // Section colors
        'section-dashboard': 'hsl(var(--section-dashboard) / <alpha-value>)',
        'section-ideas': 'hsl(var(--section-ideas) / <alpha-value>)',
        'section-pipeline': 'hsl(var(--section-pipeline) / <alpha-value>)',
        'section-workspaces':
          'hsl(var(--section-workspaces) / <alpha-value>)',
        'section-calendar': 'hsl(var(--section-calendar) / <alpha-value>)',
        'section-goals': 'hsl(var(--section-goals) / <alpha-value>)',
        'section-habits': 'hsl(var(--section-habits) / <alpha-value>)',
        'section-notes': 'hsl(var(--section-notes) / <alpha-value>)',
        'section-wellbeing':
          'hsl(var(--section-wellbeing) / <alpha-value>)',

        // Status colors
        'status-todo-bg': 'hsl(var(--status-todo-bg) / <alpha-value>)',
        'status-todo-fg': 'hsl(var(--status-todo-fg) / <alpha-value>)',
        'status-todo-border':
          'hsl(var(--status-todo-border) / <alpha-value>)',
        'status-in-progress-bg':
          'hsl(var(--status-in-progress-bg) / <alpha-value>)',
        'status-in-progress-fg':
          'hsl(var(--status-in-progress-fg) / <alpha-value>)',
        'status-in-progress-border':
          'hsl(var(--status-in-progress-border) / <alpha-value>)',
        'status-completed-bg':
          'hsl(var(--status-completed-bg) / <alpha-value>)',
        'status-completed-fg':
          'hsl(var(--status-completed-fg) / <alpha-value>)',
        'status-completed-border':
          'hsl(var(--status-completed-border) / <alpha-value>)',
        'status-cancelled-bg':
          'hsl(var(--status-cancelled-bg) / <alpha-value>)',
        'status-cancelled-fg':
          'hsl(var(--status-cancelled-fg) / <alpha-value>)',
        'status-cancelled-border':
          'hsl(var(--status-cancelled-border) / <alpha-value>)',

        // Priority colors
        'priority-low-bg': 'hsl(var(--priority-low-bg) / <alpha-value>)',
        'priority-low-fg': 'hsl(var(--priority-low-fg) / <alpha-value>)',
        'priority-low-border':
          'hsl(var(--priority-low-border) / <alpha-value>)',
        'priority-medium-bg':
          'hsl(var(--priority-medium-bg) / <alpha-value>)',
        'priority-medium-fg':
          'hsl(var(--priority-medium-fg) / <alpha-value>)',
        'priority-medium-border':
          'hsl(var(--priority-medium-border) / <alpha-value>)',
        'priority-high-bg': 'hsl(var(--priority-high-bg) / <alpha-value>)',
        'priority-high-fg': 'hsl(var(--priority-high-fg) / <alpha-value>)',
        'priority-high-border':
          'hsl(var(--priority-high-border) / <alpha-value>)',
        'priority-urgent-bg':
          'hsl(var(--priority-urgent-bg) / <alpha-value>)',
        'priority-urgent-fg':
          'hsl(var(--priority-urgent-fg) / <alpha-value>)',
        'priority-urgent-border':
          'hsl(var(--priority-urgent-border) / <alpha-value>)',

        // Timer mode colors
        'timer-work-primary':
          'hsl(var(--timer-work-primary) / <alpha-value>)',
        'timer-work-bg': 'hsl(var(--timer-work-bg) / <alpha-value>)',
        'timer-short-break':
          'hsl(var(--timer-short-break) / <alpha-value>)',
        'timer-short-bg': 'hsl(var(--timer-short-bg) / <alpha-value>)',
        'timer-long-break':
          'hsl(var(--timer-long-break) / <alpha-value>)',
        'timer-long-bg': 'hsl(var(--timer-long-bg) / <alpha-value>)',

        // Tag colors
        'tag-red': 'hsl(var(--tag-red) / <alpha-value>)',
        'tag-orange': 'hsl(var(--tag-orange) / <alpha-value>)',
        'tag-amber': 'hsl(var(--tag-amber) / <alpha-value>)',
        'tag-lime': 'hsl(var(--tag-lime) / <alpha-value>)',
        'tag-green': 'hsl(var(--tag-green) / <alpha-value>)',
        'tag-teal': 'hsl(var(--tag-teal) / <alpha-value>)',
        'tag-cyan': 'hsl(var(--tag-cyan) / <alpha-value>)',
        'tag-blue': 'hsl(var(--tag-blue) / <alpha-value>)',
        'tag-violet': 'hsl(var(--tag-violet) / <alpha-value>)',
        'tag-pink': 'hsl(var(--tag-pink) / <alpha-value>)',

        // Chart colors
        'chart-1': 'hsl(var(--chart-1) / <alpha-value>)',
        'chart-2': 'hsl(var(--chart-2) / <alpha-value>)',
        'chart-3': 'hsl(var(--chart-3) / <alpha-value>)',
        'chart-4': 'hsl(var(--chart-4) / <alpha-value>)',
        'chart-5': 'hsl(var(--chart-5) / <alpha-value>)',
      },

      /* ─── Typography ───────────────────────────────────────────── */
      fontSize: {
        display: ['48px', { lineHeight: '1', letterSpacing: '-0.025em' }],
        h1: ['36px', { lineHeight: '1.25', letterSpacing: '-0.025em' }],
        h2: ['30px', { lineHeight: '1.25' }],
        h3: ['24px', { lineHeight: '1.25' }],
        h4: ['20px', { lineHeight: '1.5' }],
        'body-lg': ['18px', { lineHeight: '1.5' }],
        body: ['16px', { lineHeight: '1.5' }],
        'body-sm': ['14px', { lineHeight: '1.5' }],
        caption: ['12px', { lineHeight: '1.5' }],
      },

      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },

      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      lineHeight: {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
      },

      /* ─── Spacing ───────────────────────────────────────────────── */
      spacing: {
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
        24: '96px',
      },

      /* ─── Border Radius ────────────────────────────────────────── */
      borderRadius: {
        none: '0',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        full: '9999px',
      },

      /* ─── Shadows ──────────────────────────────────────────────── */
      boxShadow: {
        none: '0 0 #0000',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },

      /* ─── Transitions ──────────────────────────────────────────── */
      transitionDuration: {
        fast: 'var(--transition-fast)',
        normal: 'var(--transition-normal)',
        slow: 'var(--transition-slow)',
        slower: 'var(--transition-slower)',
      },

      /* ─── Animations ───────────────────────────────────────────── */
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        fadeInOut: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        lift: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-4px)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeInUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        progressFill: {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': {
            transform: 'translateY(-100px) rotate(360deg)',
            opacity: '0',
          },
        },
      },

      animation: {
        float: 'float 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        wiggle: 'wiggle 1s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        fadeInOut: 'fadeInOut 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        sparkle: 'sparkle 1s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        lift: 'lift 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        scaleIn: 'scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        slideInRight: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        slideInLeft: 'slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fadeInUp: 'fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pulseGlow: 'pulseGlow 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        progressFill: 'progressFill 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        shimmer: 'shimmer 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        confetti: 'confetti 1s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },

      /* ─── Breakpoints ──────────────────────────────────────────── */
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## 3. Class Name Merger Utility (cn)

Create `lib/cn.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with intelligent conflict resolution.
 * Combines clsx (conditional classes) with twMerge (Tailwind conflict resolution).
 *
 * @example
 * cn('px-2', condition && 'px-4') // Returns 'px-4' (not 'px-2 px-4')
 * cn('text-base', 'text-lg') // Returns 'text-lg'
 * cn('bg-red-500', { 'bg-blue-500': isActive }) // Conditionally merges
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Install dependencies:
```bash
npm install clsx tailwind-merge
```

---

## 4. Design Token Usage Guide

### Color Tokens

```tsx
/* ─── Background & Surface Colors ─────────────────────────────── */

// Page background
<div className="bg-background text-foreground">
  Content
</div>

// Cards and elevated surfaces
<div className="bg-card text-card-foreground rounded-lg shadow-md">
  Card content
</div>

// Popovers, dropdowns
<div className="bg-popover text-popover-foreground">
  Popover content
</div>

/* ─── Primary Actions ──────────────────────────────────────────── */

// Primary buttons, CTAs, links
<button className="bg-primary text-primary-foreground hover:opacity-90">
  Click me
</button>

// Links
<a className="text-primary hover:underline">Link text</a>

/* ─── Secondary & Muted ───────────────────────────────────────── */

// Secondary backgrounds
<div className="bg-secondary text-secondary-foreground">
  Secondary content
</div>

// Disabled states, secondary text
<span className="text-muted-foreground">Secondary text</span>

// Hover backgrounds, accents
<div className="bg-accent hover:bg-accent">
  Hover area
</div>

/* ─── Semantic Status Colors ──────────────────────────────────── */

// Success state
<div className="bg-green-100 text-green-900">
  <p className="text-success">✓ Success!</p>
</div>

// Warning state
<div className="text-warning">⚠ Warning message</div>

// Error / Destructive
<button className="bg-destructive text-destructive-foreground">
  Delete
</button>

// Info
<div className="text-info">ℹ Information</div>

/* ─── Section Colors (Sidebar Navigation) ──────────────────────── */

// Dashboard section
<nav className="bg-section-dashboard">Dashboard</nav>

// Ideas/Tasks section
<nav className="text-section-ideas">Ideas</nav>

// Pipeline/Projects section
<nav className="border-section-pipeline">Projects</nav>

// Workspaces, Calendar, Goals, Habits, Notes, Wellbeing
<nav className="bg-section-workspaces">Workspaces</nav>

/* ─── Status Indicators ────────────────────────────────────────── */

// To-Do status
<badge className="bg-status-todo-bg text-status-todo-fg border-status-todo-border">
  To Do
</badge>

// In Progress status
<badge className="bg-status-in-progress-bg text-status-in-progress-fg border-status-in-progress-border">
  In Progress
</badge>

// Completed status
<badge className="bg-status-completed-bg text-status-completed-fg border-status-completed-border">
  Done
</badge>

// Cancelled status
<badge className="bg-status-cancelled-bg text-status-cancelled-fg border-status-cancelled-border">
  Cancelled
</badge>

/* ─── Priority Colors ──────────────────────────────────────────── */

// Low priority
<badge className="bg-priority-low-bg text-priority-low-fg border-priority-low-border">
  Low
</badge>

// Medium priority
<badge className="bg-priority-medium-bg text-priority-medium-fg border-priority-medium-border">
  Medium
</badge>

// High priority
<badge className="bg-priority-high-bg text-priority-high-fg border-priority-high-border">
  High
</badge>

// Urgent priority
<badge className="bg-priority-urgent-bg text-priority-urgent-fg border-priority-urgent-border">
  Urgent
</badge>

/* ─── Timer Mode Colors ───────────────────────────────────────── */

// Work session
<div className="bg-timer-work-bg">
  <span className="text-timer-work-primary">Work</span>
</div>

// Short break
<div className="text-timer-short-break">Short Break</div>

// Long break
<div className="text-timer-long-break">Long Break</div>

/* ─── Tag Colors ───────────────────────────────────────────────– */

// 10 tag color options
<tag className="bg-tag-red">Red Tag</tag>
<tag className="bg-tag-orange">Orange Tag</tag>
<tag className="bg-tag-amber">Amber Tag</tag>
<tag className="bg-tag-lime">Lime Tag</tag>
<tag className="bg-tag-green">Green Tag</tag>
<tag className="bg-tag-teal">Teal Tag</tag>
<tag className="bg-tag-cyan">Cyan Tag</tag>
<tag className="bg-tag-blue">Blue Tag</tag>
<tag className="bg-tag-violet">Violet Tag</tag>
<tag className="bg-tag-pink">Pink Tag</tag>

/* ─── Chart Colors ────────────────────────────────────────────── */

// 5-color palette for charts
<div className="bg-chart-1">Chart 1</div>
<div className="bg-chart-2">Chart 2</div>
<div className="bg-chart-3">Chart 3</div>
<div className="bg-chart-4">Chart 4</div>
<div className="bg-chart-5">Chart 5</div>
```

### Spacing

```tsx
/* ─── Padding ──────────────────────────────────────────────────── */

// 4px spacing (tight)
<div className="p-1">Tight padding</div>

// 8px spacing (default)
<div className="p-2">Default padding</div>

// 12px spacing
<div className="p-3">Medium padding</div>

// 16px spacing (standard)
<div className="p-4">Standard padding</div>

// 24px spacing (comfortable)
<div className="p-6">Comfortable padding</div>

// 32px spacing (section)
<div className="p-8">Section padding</div>

/* ─── Gaps ────────────────────────────────────────────────────── */

// Flex/Grid gap
<div className="flex gap-2">Tight gap</div>
<div className="flex gap-4">Standard gap</div>
<div className="flex gap-8">Section gap</div>

/* ─── Margins ──────────────────────────────────────────────────– */

<div className="mt-4">Top margin</div>
<div className="mb-6">Bottom margin</div>

/* ─── Breakpoint-Responsive ───────────────────────────────────── */

// Mobile p-4, tablet p-6, desktop p-8
<div className="p-4 md:p-6 lg:p-8">Responsive padding</div>

// Mobile gap-2, desktop gap-4
<div className="flex gap-2 lg:gap-4">Responsive gap</div>
```

### Typography

```tsx
/* ─── Display & Headlines ──────────────────────────────────────– */

<h1 className="text-display font-bold">Hero Headline</h1>
<h1 className="text-h1 font-bold">Page Title</h1>
<h2 className="text-h2 font-semibold">Section Header</h2>
<h3 className="text-h3 font-semibold">Subsection</h3>
<h4 className="text-h4 font-semibold">Card Title</h4>

/* ─── Body Text ───────────────────────────────────────────────– */

<p className="text-body">Standard body text</p>
<p className="text-body-lg">Lead paragraph</p>
<p className="text-body-sm">Secondary text</p>
<span className="text-caption text-muted-foreground">Caption text</span>

/* ─── Font Weight ──────────────────────────────────────────────– */

<p className="font-normal">Regular weight (400)</p>
<p className="font-medium">Medium weight (500)</p>
<p className="font-semibold">Semibold (600)</p>
<p className="font-bold">Bold (700)</p>

/* ─── Line Heights ────────────────────────────────────────────– */

<p className="leading-none">No line height</p>
<p className="leading-tight">Tight (1.25)</p>
<p className="leading-snug">Snug (1.375)</p>
<p className="leading-normal">Normal (1.5)</p>
<p className="leading-relaxed">Relaxed (1.625)</p>
<p className="leading-loose">Loose (2)</p>

/* ─── Text Alignment ───────────────────────────────────────────– */

<p className="text-left">Left aligned</p>
<p className="text-center">Center aligned</p>
<p className="text-right">Right aligned</p>

/* ─── Text Truncation ──────────────────────────────────────────– */

<p className="truncate">Truncate long single line...</p>
<p className="line-clamp-2">Clamp to 2 lines...</p>
<p className="line-clamp-3">Clamp to 3 lines...</p>
```

### Border Radius

```tsx
/* ─── Border Radius ───────────────────────────────────────────– */

// Default radius (12px)
<div className="rounded">Default</div>

// Small radius (6px)
<div className="rounded-sm">Small</div>

// Medium radius (8px)
<div className="rounded-md">Medium</div>

// Large radius (12px)
<div className="rounded-lg">Large</div>

// Extra large radius (16px)
<div className="rounded-xl">Extra Large</div>

// Circular
<div className="rounded-full">Circular</div>

// Per-side radius
<div className="rounded-t-lg rounded-b-none">Rounded top</div>
```

### Dark Mode

```tsx
/* ─── Dark Mode Classes ───────────────────────────────────────– */

// Light background, dark mode background
<div className="bg-white dark:bg-slate-900">
  Content
</div>

// Light text, dark mode text
<p className="text-gray-900 dark:text-gray-100">
  Dark mode text
</p>

// Light border, dark mode border
<div className="border border-gray-200 dark:border-gray-700">
  Bordered
</div>

// Combination
<div className="bg-background text-foreground dark:bg-slate-900 dark:text-white">
  Already handles dark mode via CSS variables!
</div>
```

### Animations

```tsx
/* ─── Animations ───────────────────────────────────────────────– */

// Floating animation
<div className="animate-float">Floating element</div>

// Wiggle animation
<button className="animate-wiggle">Click me</button>

// Fade in/out pulsing
<div className="animate-fadeInOut">Pulsing indicator</div>

// Sparkle animation
<div className="animate-sparkle">✨ Sparkle</div>

// Lift on hover
<button className="hover:animate-lift">Hover to lift</button>

// Scale in entrance
<div className="animate-scaleIn">Scales in on mount</div>

// Slide animations
<div className="animate-slideInRight">Slides in from right</div>
<div className="animate-slideInLeft">Slides in from left</div>

// Fade up entrance
<div className="animate-fadeInUp">Fades up on mount</div>

// Pulse glow (recording indicator)
<div className="animate-pulseGlow">Recording...</div>

// Progress fill
<div className="animate-progressFill">Progress bar</div>

// Shimmer loading
<div className="animate-shimmer h-4 bg-gradient-to-r">
  Loading skeleton
</div>

// Confetti celebration
<div className="animate-confetti">🎉</div>

/* ─── Reduced Motion ───────────────────────────────────────────– */

// Automatically respects prefers-reduced-motion
// (all animations pause when OS setting is enabled)
```

---

## 5. Dark Mode Implementation

Create `lib/theme-provider.tsx`:

```tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme-preference',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null
    if (stored) {
      setThemeState(stored)
    }
    setMounted(true)
  }, [storageKey])

  // Resolve theme and update DOM
  useEffect(() => {
    if (!mounted) return

    const resolved: 'light' | 'dark' = (() => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
      }
      return theme
    })()

    setResolvedTheme(resolved)

    // Update HTML element class
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme, mounted])

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light')
      if (e.matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(storageKey, newTheme)
  }

  // Avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

### Using the Theme Provider

In your root layout (`app/layout.tsx`):

```tsx
import { ThemeProvider } from '@/lib/theme-provider'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  preload: true,
  display: 'swap',
  feature: {
    '\'cv02\'': 2,
    '\'cv03\'': 3,
    '\'cv04\'': 4,
    '\'cv11\'': 11,
  },
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider defaultTheme="system" storageKey="theme-preference">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Theme Toggle Component

Create `components/theme-toggle.tsx`:

```tsx
'use client'

import { useTheme } from '@/lib/theme-provider'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  const toggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggle}
      className="rounded-md p-2 hover:bg-accent transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}
```

---

## 6. Font Setup

Configure Inter with proper feature flags in `app/layout.tsx`:

```tsx
import { Inter } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  preload: true,
  display: 'swap',
  weights: ['400', '500', '600', '700'],
  axes: [
    {
      tag: 'wght',
      min: 400,
      max: 700,
    },
  ],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
      </body>
    </html>
  )
}
```

In `globals.css`, the font stack is already configured:

```css
:root {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
    'Helvetica Neue', sans-serif;
  --font-feature-settings: 'cv02' on, 'cv03' on, 'cv04' on, 'cv11' on;
}

body {
  font-family: var(--font-family);
  font-feature-settings: var(--font-feature-settings);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 7. Shared Tailwind Config (Monorepo Preset)

For monorepos (web, mobile, desktop), create a shared preset at `packages/config/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

// This is a preset that web, mobile (NativeWind), and desktop extend
const sharedTheme = {
  extend: {
    colors: {
      background: 'hsl(var(--background) / <alpha-value>)',
      foreground: 'hsl(var(--foreground) / <alpha-value>)',
      card: 'hsl(var(--card) / <alpha-value>)',
      'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
      primary: 'hsl(var(--primary) / <alpha-value>)',
      'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
      secondary: 'hsl(var(--secondary) / <alpha-value>)',
      'secondary-foreground':
        'hsl(var(--secondary-foreground) / <alpha-value>)',
      muted: 'hsl(var(--muted) / <alpha-value>)',
      'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
      accent: 'hsl(var(--accent) / <alpha-value>)',
      'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
      destructive: 'hsl(var(--destructive) / <alpha-value>)',
      'destructive-foreground':
        'hsl(var(--destructive-foreground) / <alpha-value>)',
      border: 'hsl(var(--border) / <alpha-value>)',
      input: 'hsl(var(--input) / <alpha-value>)',
      ring: 'hsl(var(--ring) / <alpha-value>)',
      success: 'hsl(var(--success) / <alpha-value>)',
      warning: 'hsl(var(--warning) / <alpha-value>)',
      error: 'hsl(var(--error) / <alpha-value>)',
      info: 'hsl(var(--info) / <alpha-value>)',
      'section-dashboard': 'hsl(var(--section-dashboard) / <alpha-value>)',
      'section-ideas': 'hsl(var(--section-ideas) / <alpha-value>)',
      'section-pipeline': 'hsl(var(--section-pipeline) / <alpha-value>)',
      'section-workspaces': 'hsl(var(--section-workspaces) / <alpha-value>)',
      'section-calendar': 'hsl(var(--section-calendar) / <alpha-value>)',
      'section-goals': 'hsl(var(--section-goals) / <alpha-value>)',
      'section-habits': 'hsl(var(--section-habits) / <alpha-value>)',
      'section-notes': 'hsl(var(--section-notes) / <alpha-value>)',
      'section-wellbeing': 'hsl(var(--section-wellbeing) / <alpha-value>)',
    },
    fontSize: {
      display: ['48px', { lineHeight: '1', letterSpacing: '-0.025em' }],
      h1: ['36px', { lineHeight: '1.25', letterSpacing: '-0.025em' }],
      h2: ['30px', { lineHeight: '1.25' }],
      h3: ['24px', { lineHeight: '1.25' }],
      h4: ['20px', { lineHeight: '1.5' }],
      'body-lg': ['18px', { lineHeight: '1.5' }],
      body: ['16px', { lineHeight: '1.5' }],
      'body-sm': ['14px', { lineHeight: '1.5' }],
      caption: ['12px', { lineHeight: '1.5' }],
    },
    fontFamily: {
      sans: ['Inter', ...defaultTheme.fontFamily.sans],
    },
    borderRadius: {
      none: '0',
      DEFAULT: 'var(--radius)',
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
      '2xl': 'var(--radius-2xl)',
      '3xl': 'var(--radius-3xl)',
      full: '9999px',
    },
  },
}

export const presets = {
  base: {
    theme: sharedTheme,
  } as Config,
}

export default {
  theme: sharedTheme,
} as Config
```

Then in `apps/web/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'
import { presets } from '@ordo/config/tailwind'

const config: Config = {
  ...presets.base,
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui-shared/**/*.{js,ts,jsx,tsx}',
  ],
}

export default config
```

---

## 8. Quick Reference: Token Summary

| Category | Token | Example |
|----------|-------|---------|
| **Colors** | `--primary` | `hsl(var(--primary))` = Cyan (#06B6D4) |
| **Colors** | `--destructive` | `hsl(var(--destructive))` = Red (#EF4444) |
| **Colors** | `--section-pipeline` | `hsl(var(--section-pipeline))` = Pink (#EC4899) |
| **Spacing** | `--spacing-4` | 16px gap/padding |
| **Radius** | `--radius` | 12px (default border-radius) |
| **Typography** | `--text-h1-size` | 36px bold headings |
| **Shadows** | `--shadow-md` | Elevation for cards |
| **Animation** | `float` | 3s infinite floating effect |
| **Duration** | `--transition-fast` | 100ms quick transitions |

---

## Checklist

- [ ] Copy `globals.css` to `app/styles/globals.css`
- [ ] Copy `tailwind.config.ts` to project root
- [ ] Create `lib/cn.ts` with the cn() utility
- [ ] Create `lib/theme-provider.tsx` for dark mode
- [ ] Create `components/theme-toggle.tsx`
- [ ] Update `app/layout.tsx` with ThemeProvider and Inter font
- [ ] Import `globals.css` in your root layout
- [ ] Test dark mode toggle
- [ ] Verify all colors render correctly
- [ ] Check animations work (and respect prefers-reduced-motion)
- [ ] Test responsive breakpoints

---

## Resources

- **Tailwind Docs**: https://tailwindcss.com/docs
- **Design System Foundations**: `/prd/02-design-system/01-foundations.md`
- **Color Reference**: All OKLCH values documented in foundations
- **Animation Guide**: Each animation has defined timing and usage

---

**Generated**: March 10, 2026  
**System**: Ordo Creator OS v1.0  
**Status**: Production Ready
