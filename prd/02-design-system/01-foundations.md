# Design System Foundations

> The visual language of Ordo Creator OS. Every color, font, and spacing decision documented.

---

## Design Philosophy

Ordo's visual language is **bold, focused, and creator-friendly**. We design for:

1. **Clarity**: Information-dense screens that don't feel cluttered
2. **Speed**: Visual hierarchy guides the eye to what matters
3. **Delight**: Subtle animations reward action without distracting
4. **Consistency**: Same visual language across Web, Mobile, Desktop

### Hard Rules

- **NO transparencies** (`rgba`, `opacity` on backgrounds): All backgrounds are solid
- **NO gradients** (`linear-gradient`, `radial-gradient`): Solid colors only
- **Dark mode mandatory**: Every component must work in both themes
- **Responsive mandatory**: 320px (mobile) to 2560px (ultrawide)

---

## Color System

### Color Space

We use **OKLCH** as the primary color space for perceptual uniformity. All colors are defined in OKLCH and mapped to hex/rgb for compatibility.

### Brand Colors

| Name | Light | Dark | Usage |
|------|-------|------|-------|
| **Primary (Cyan)** | `#06B6D4` | `#22D3EE` | Primary actions, links, active states |
| **Primary Foreground** | `#FFFFFF` | `#1A1A24` | Text on primary backgrounds |

### Core Palette

#### Light Theme

| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| `--background` | `#FFFFFF` | `oklch(0.985 0.002 247.839)` | Page background |
| `--foreground` | `#0A0A0B` | `oklch(0.145 0.005 285.823)` | Primary text |
| `--card` | `#FFFFFF` | same as background | Card surfaces |
| `--card-foreground` | `#0A0A0B` | same as foreground | Card text |
| `--popover` | `#FFFFFF` | same as background | Popover surfaces |
| `--popover-foreground` | `#0A0A0B` | same as foreground | Popover text |
| `--primary` | `#06B6D4` | `oklch(0.68 0.18 205)` | Primary actions |
| `--primary-foreground` | `#FFFFFF` | `oklch(1 0 0)` | Text on primary |
| `--secondary` | `#ECFEFF` | `oklch(0.96 0.01 205)` | Secondary surfaces |
| `--secondary-foreground` | `#0891B2` | `oklch(0.4 0.1 205)` | Secondary text |
| `--muted` | `#F5F3FF` | `oklch(0.96 0.01 286)` | Muted surfaces |
| `--muted-foreground` | `#6B7280` | `oklch(0.55 0.04 286)` | Muted text, captions |
| `--accent` | `#F5F3FF` | same as muted | Hover backgrounds |
| `--accent-foreground` | `#7C3AED` | purple | Accent text |
| `--destructive` | `#EF4444` | `oklch(0.65 0.22 28)` | Danger actions |
| `--destructive-foreground` | `#FFFFFF` | white | Text on danger |
| `--border` | `#E5E7EB` | `oklch(0.92 0.01 286)` | Borders, dividers |
| `--input` | `#E5E7EB` | same as border | Input borders |
| `--ring` | `#06B6D4` | same as primary | Focus rings |

#### Dark Theme

| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| `--background` | `#0F0F14` | `oklch(0.12 0.02 260)` | Page background |
| `--foreground` | `#FAFAFA` | `oklch(0.98 0 0)` | Primary text |
| `--card` | `#1A1A24` | `oklch(0.15 0.025 260)` | Card surfaces |
| `--card-foreground` | `#FAFAFA` | same as foreground | Card text |
| `--primary` | `#22D3EE` | `oklch(0.72 0.16 205)` | Primary actions |
| `--primary-foreground` | `#1A1A24` | dark | Text on primary |
| `--secondary` | `#27272A` | `oklch(0.2 0.04 260)` | Secondary surfaces |
| `--secondary-foreground` | `#FAFAFA` | white | Secondary text |
| `--muted` | `#27272A` | `oklch(0.2 0.02 260)` | Muted surfaces |
| `--muted-foreground` | `#A1A1AA` | `oklch(0.7 0.02 260)` | Muted text |
| `--accent` | `#3F3F46` | `oklch(0.2 0.04 260)` | Hover backgrounds |
| `--accent-foreground` | `#FAFAFA` | white | Accent text |
| `--destructive` | `#DC2626` | `oklch(0.6 0.2 25)` | Danger actions |
| `--border` | `#27272A` | `oklch(0.22 0.02 260)` | Borders |
| `--ring` | `#22D3EE` | same as primary | Focus rings |

### Semantic Colors

Use these for status indicators, alerts, and feedback.

| Token | Default | Light Variant | Dark Variant | Usage |
|-------|---------|--------------|-------------|-------|
| `success` | `#10B981` | `#34D399` | `#059669` | Success states, confirmations |
| `warning` | `#F59E0B` | `#FBBF24` | `#D97706` | Warnings, cautions |
| `error` | `#EF4444` | `#F87171` | `#DC2626` | Errors, destructive |
| `info` | `#3B82F6` | `#60A5FA` | `#2563EB` | Information, tips |

### Extended Palette

For charts, tags, decorative elements.

| Name | Hex | Usage |
|------|-----|-------|
| `cyan` | `#06B6D4` | Primary brand, Dashboard section |
| `purple` | `#A855F7` | Accent, sidebar dark mode primary |
| `pink` | `#EC4899` | Projects section, Goals section |
| `orange` | `#F97316` | Workspaces section |
| `green` | `#10B981` | Habits section, success |
| `blue` | `#3B82F6` | Calendar section |
| `violet` | `#8B5CF6` | Tasks section |
| `rose` | `#F43F5E` | Wellbeing section |
| `yellow` | `#EAB308` | Notes section |

### Section Theming

Each major section has an assigned color for visual wayfinding.

| Section | Color | Hex |
|---------|-------|-----|
| Dashboard | Cyan | `#06B6D4` |
| Ideas/Tasks | Violet | `#8B5CF6` |
| Pipeline/Projects | Pink | `#EC4899` |
| Workspaces | Orange | `#F97316` |
| Calendar | Blue | `#3B82F6` |
| Goals | Pink | `#EC4899` |
| Consistency/Habits | Green | `#10B981` |
| Notes | Yellow | `#EAB308` |
| Wellbeing | Rose | `#F43F5E` |

### Priority Colors

| Priority | Background | Foreground | Border |
|----------|-----------|------------|--------|
| LOW | `#DBEAFE` | `#1E40AF` | `#93C5FD` |
| MEDIUM | `#FEF3C7` | `#92400E` | `#FCD34D` |
| HIGH | `#FECACA` | `#991B1B` | `#F87171` |
| URGENT | `#F87171` | `#FFFFFF` | `#EF4444` |

### Status Colors

| Status | Background | Foreground | Border |
|--------|-----------|------------|--------|
| TODO | `#F3F4F6` | `#374151` | `#D1D5DB` |
| IN_PROGRESS | `#DBEAFE` | `#1E40AF` | `#93C5FD` |
| COMPLETED | `#D1FAE5` | `#065F46` | `#6EE7B7` |
| CANCELLED | `#F3F4F6` | `#6B7280` | `#D1D5DB` |

### Timer Mode Colors

| Mode | Primary | Background |
|------|---------|-----------|
| WORK | `#EF4444` | `#FEE2E2` |
| SHORT_BREAK | `#22C55E` | `#DCFCE7` |
| LONG_BREAK | `#3B82F6` | `#DBEAFE` |

### Tag Colors (10 options)

```
#EF4444  Red
#F97316  Orange
#F59E0B  Amber
#84CC16  Lime
#22C55E  Green
#14B8A6  Teal
#06B6D4  Cyan
#3B82F6  Blue
#8B5CF6  Violet
#EC4899  Pink
```

### Chart Colors

| Slot | Light Theme | Dark Theme |
|------|------------|------------|
| Chart 1 | `#F97316` (Orange) | `#3B82F6` (Blue) |
| Chart 2 | `#14B8A6` (Teal) | `#10B981` (Green) |
| Chart 3 | `#4B5563` (Slate) | `#FACC15` (Amber) |
| Chart 4 | `#FACC15` (Amber) | `#A855F7` (Purple) |
| Chart 5 | `#EA580C` (Deep Orange) | `#EF4444` (Red) |

---

## Color Usage Rules

### Do

- Use `--primary` for main CTAs and interactive elements
- Use `--foreground` for body text
- Use `--muted-foreground` for secondary text and captions
- Use `--border` for all dividers and borders
- Use `--card` for elevated surface backgrounds
- Use semantic colors (success/warning/error/info) for status indicators
- Use section colors for navigation wayfinding only

### Don't

- Don't use raw hex values -- always reference CSS variables or design tokens
- Don't mix light/dark theme colors manually -- let the system handle it
- Don't use `rgba()` for backgrounds -- use solid colors from the palette
- Don't create new colors without adding them to the design system
- Don't use primary color for large background areas -- it's for accents
- Don't use more than 3 colors on any single component

---

## Typography

### Font Stack

```
Primary: 'Inter'
Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
          'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
          'Helvetica Neue', sans-serif

Font Features: cv02, cv03, cv04, cv11
Rendering: antialiased (webkit + moz)
```

### Type Scale

| Class | Size | Weight | Tracking | Usage |
|-------|------|--------|----------|-------|
| `text-display` | 48px (3rem) | Bold (700) | Tight (-0.025em) | Hero headlines |
| `text-heading-1` | 36px (2.25rem) | Bold (700) | Tight | Page titles |
| `text-heading-2` | 30px (1.875rem) | Semibold (600) | Tight | Section headers |
| `text-heading-3` | 24px (1.5rem) | Semibold (600) | Normal | Subsection headers |
| `text-heading-4` | 20px (1.25rem) | Semibold (600) | Normal | Card titles |
| `text-body-lg` | 18px (1.125rem) | Normal (400) | Normal | Lead paragraphs |
| `text-body` | 16px (1rem) | Normal (400) | Normal | Body text |
| `text-body-sm` | 14px (0.875rem) | Normal (400) | Normal | Secondary text |
| `text-caption` | 12px (0.75rem) | Normal (400) | Normal | Captions, labels |

### Line Heights

| Name | Value | Usage |
|------|-------|-------|
| `none` | 1.0 | Display text, single-line headings |
| `tight` | 1.25 | Headings, compact lists |
| `snug` | 1.375 | Subheadings |
| `normal` | 1.5 | Body text (default) |
| `relaxed` | 1.625 | Long-form reading |
| `loose` | 2.0 | Spacious captions |

### Typography Rules

- **Headings**: Always use semibold (600) or bold (700)
- **Body text**: Always use regular (400) or medium (500)
- **Captions**: Use `text-muted-foreground` color
- **Links**: Use `text-primary` with underline on hover
- **Numbers**: Use tabular-nums for aligned numerical data
- **Truncation**: Use `truncate` class for single-line overflow, `line-clamp-{n}` for multi-line

---

## Spacing

### Base Unit

All spacing is based on a **4px grid system**.

### Scale

| Token | Value | Usage |
|-------|-------|-------|
| `0` | 0px | Reset |
| `0.5` | 2px | Micro gaps |
| `1` | 4px | Tight spacing |
| `1.5` | 6px | Between related items |
| `2` | 8px | Default gap |
| `3` | 12px | Element padding |
| `4` | 16px | Card padding, section gaps |
| `5` | 20px | Component spacing |
| `6` | 24px | Section padding |
| `8` | 32px | Page section gaps |
| `10` | 40px | Major section gaps |
| `12` | 48px | Page padding |
| `16` | 64px | Hero spacing |
| `20` | 80px | Page margins |
| `24` | 96px | Section dividers |

### Named Spacing

| Name | Value | Usage |
|------|-------|-------|
| `xs` | 4px | Inline element gaps |
| `sm` | 8px | Compact component padding |
| `md` | 16px | Standard component padding |
| `lg` | 24px | Comfortable component padding |
| `xl` | 32px | Section-level spacing |
| `2xl` | 48px | Major layout spacing |
| `3xl` | 64px | Page-level spacing |

### Spacing Rules

- **Consistent direction**: Use `gap` for flex/grid containers (not margins)
- **Page padding**: `p-4` mobile, `p-6` tablet, `p-8` desktop
- **Card padding**: `p-4` mobile, `p-6` desktop
- **Between sections**: `gap-8` (32px) minimum
- **Between related items**: `gap-2` (8px) or `gap-3` (12px)

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `none` | 0px | Sharp corners (rare) |
| `sm` | 6px | Small elements, tags, badges |
| `md` | 8px | Inputs, buttons, small cards |
| `lg` | 10px | Cards, panels (default) |
| `xl` | 14px | Modals, large cards |
| `2xl` | 18px | Large panels |
| `3xl` | 24px | Feature cards |
| `full` | 9999px | Circular elements, pills |

### Default: `--radius: 0.75rem (12px)`

All derived values calculate from this base:
- `sm` = `calc(var(--radius) - 4px)` = 8px
- `md` = `calc(var(--radius) - 2px)` = 10px
- `lg` = `var(--radius)` = 12px
- `xl` = `calc(var(--radius) + 4px)` = 16px

---

## Shadows

### Web/Desktop Shadows

Uses Tailwind shadow utilities. No custom shadows on most elements.

### Mobile Shadows (React Native)

| Token | Properties | Usage |
|-------|-----------|-------|
| `none` | No shadow | Flat elements |
| `sm` | offset(0,1) opacity(0.05) radius(2) elevation(1) | Subtle depth |
| `md` | offset(0,2) opacity(0.1) radius(4) elevation(3) | Cards, panels |
| `lg` | offset(0,4) opacity(0.15) radius(8) elevation(6) | Modals, popovers |
| `xl` | offset(0,8) opacity(0.2) radius(16) elevation(12) | Overlays |

### Workspace Shadows (Dynamic)

Based on the active workspace color:
```css
.shadow-workspace:     0 4px 6px -1px var(--workspace-color-20),
                       0 2px 4px -1px var(--workspace-color-10);
.shadow-workspace-lg:  0 10px 15px -3px var(--workspace-color-30),
                       0 4px 6px -2px var(--workspace-color-20);
.shadow-colored:       0 4px 14px 0 rgba(var(--workspace-color-rgb), 0.25);
.shadow-glow:          0 0 20px var(--workspace-color-30);
```

---

## Responsive Breakpoints

| Name | Min Width | Target |
|------|-----------|--------|
| Default | 0px | Mobile phones (320px+) |
| `sm` | 640px | Large phones / small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops / large tablets |
| `xl` | 1280px | Laptops / desktops |
| `2xl` | 1536px | Large desktops |

### Design Targets

| Category | Breakpoint | Layout |
|----------|-----------|--------|
| **Mobile** | 320px - 640px | Single column, stacked |
| **Tablet** | 641px - 1024px | Two columns, sidebar collapsed |
| **Desktop** | 1025px+ | Multi-column, sidebar expanded |

---

## Animation

### Timing Functions

| Name | Curve | Usage |
|------|-------|-------|
| `ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Elements entering view |
| `ease-in` | `cubic-bezier(0.4, 0.0, 1, 1)` | Elements leaving view |
| `ease-in-out` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | State transitions |
| `spring` | custom | Bouncy interactions |

### Duration Scale

| Name | Duration | Usage |
|------|----------|-------|
| `instant` | 0ms | No animation |
| `fast` | 100ms | Hover states, toggles |
| `normal` | 200ms | Most transitions |
| `slow` | 300ms | Modals, panels |
| `slower` | 500ms | Page transitions |

### Named Animations

| Animation | Duration | Usage |
|-----------|----------|-------|
| `float` | 3s infinite | Decorative floating elements |
| `wiggle` | 1s infinite | Attention-grabbing |
| `fadeInOut` | 3s infinite | Pulsing indicators |
| `sparkle` | 1s infinite | Achievement celebrations |
| `lift` | 0.2s | Card hover elevation |
| `scaleIn` | 0.2s | Element entrance |
| `slideInRight` | 0.3s | Panel slide-in |
| `slideInLeft` | 0.3s | Panel slide-in |
| `fadeInUp` | 0.3s | Element entrance from below |
| `pulseGlow` | 2s infinite | Active/recording indicator |
| `progressFill` | 0.5s | Progress bar fill |
| `shimmer` | 2s infinite | Loading skeleton |
| `confetti` | 1s | Achievement celebration |

### Animation Rules

- **Respect `prefers-reduced-motion`**: Disable all non-essential animations
- **Never block interaction**: Animations run alongside, never before user action
- **Keep it subtle**: Most animations < 300ms
- **Purpose-driven**: Every animation communicates something (entrance, feedback, celebration)

---

## Accessibility Tokens

### Focus States

```css
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  /* Borders increase to 2px */
  /* All elements get visible borders */
}
```

### Minimum Touch Target

- Mobile: 44px x 44px minimum
- Desktop: 32px x 32px minimum

---

## File Locations

| Token Type | Source File |
|-----------|------------|
| CSS Variables | `packages/styles/src/variables.css` |
| Tailwind Theme | `packages/styles/src/theme.css` |
| JS Tokens | `packages/styles/src/tokens.ts` |
| Base Styles | `packages/styles/src/base.css` |
| Component Utilities | `packages/styles/src/components.css` |
| CVA Configs | `packages/ui-shared/src/utils/cva-configs.ts` |
| Mobile Tokens | `apps/mobile/app/lib/design-tokens.ts` |

---

*The design system is the contract between design and engineering. Every decision here is non-negotiable.*
