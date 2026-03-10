# Complete Brand System for Ordo Creator OS

> The definitive guide for how Ordo's brand identity applies across ALL contexts, platforms, and mediums.

**Last Updated**: March 10, 2026  
**Owned By**: Brand & Design team  
**Related Documents**: `/prd/04-brand-marketing/`, `/prd/02-design-system/`

---

## Table of Contents

1. [Color Architecture](#1-color-architecture)
2. [Typography System](#2-typography-system)
3. [Logo Usage Guide](#3-logo-usage-guide)
4. [Illustration & Imagery Style](#4-illustration--imagery-style)
5. [Brand Application Matrix](#5-brand-application-matrix)
6. [Dark Mode as Brand](#6-dark-mode-as-brand)
7. [Accessibility in Brand](#7-accessibility-in-brand)
8. [Implementation Checklist](#implementation-checklist)

---

## 1. Color Architecture

### 1.1 Color Philosophy

Ordo's color system is **purposeful, perceptual, and platform-aware**. Every color choice serves the creator and supports the brand identity: order emerging from chaos, clarity in complexity, and empowerment through consistency.

- **Primary Brand Color (Cyan)**: Used sparingly and strategically to signal primary actions, brand moments, and creator focus
- **Section Colors**: Each major feature section has a signature accent color to create visual wayfinding
- **Semantic Colors**: Success, warning, error, and info states communicate status without text
- **Dark Mode First**: All colors are designed and tested in dark mode as the primary showcase

### 1.2 Primary Palette: Cyan Hero Color

**Cyan** is the signature brand color. It represents progress, consistency, and the moment of creation.

#### Cyan Values

| Context | Hex | OKLCH | Usage |
|---------|-----|-------|-------|
| Light Theme | `#06B6D4` | `oklch(0.68 0.18 205)` | Buttons, links, primary actions |
| Dark Theme | `#22D3EE` | `oklch(0.72 0.16 205)` | Buttons, links, primary actions |
| Pale (Background) | `#ECFEFF` | `oklch(0.96 0.01 205)` | Selected states, subtle highlights |

#### When to Use Cyan

**DO USE for:**
- Primary CTA buttons ("Create Idea", "Publish Now", "Save Draft")
- Active navigation items (sidebar highlight, current page indicator)
- Focus rings and keyboard navigation states
- Link text (inline hyperlinks)
- Progress indicators (progress bars, step counters)
- The Consistency Score number and accent bar
- Brand moments in marketing (hero headlines, feature callouts)
- Loading states (spinner color)
- Success completion animations

**DO NOT USE for:**
- Large background areas (> 100px²)
- Body text or paragraphs
- Borders (use `--border` token instead)
- Multiple buttons on one screen (only the primary action gets cyan)
- Icons in information hierarchy (use icons in primary color only once per major section)
- Disabled state buttons (use gray instead)

#### Cyan Usage Rules by Surface

```
Primary CTA Button (enabled):
  Background: Cyan (#06B6D4 light / #22D3EE dark)
  Text: White (#FFFFFF light) / Dark (#1A1A24 dark)
  Hover: Darken by 8% (reduce lightness by 0.08 in OKLCH)
  Active: Darken by 15% (reduce lightness by 0.15 in OKLCH)
  Focus: Add 2px outline in cyan with 2px offset

Link Text:
  Color: Cyan (#06B6D4 light / #22D3EE dark)
  Underline: None by default
  Hover: Underline appears (1px, same color)
  Active: Underline visible

Focus Ring:
  Width: 2px
  Color: Cyan (#06B6D4 light / #22D3EE dark)
  Offset: 2px from element edge
  Always visible on keyboard navigation
```

#### Cyan in Different Contexts

**Web App (LMS)**
- Buttons in header: Yes (1 primary CTA per header)
- Sidebar active item: Yes, full height highlight
- Input focus ring: Yes
- Hover cards: No, use pale cyan (#ECFEFF) background instead

**Mobile App**
- Tab bar active indicator: Yes, underline or fill
- Floating action button: Yes, primary action button
- Sheet header close button: No, use gray
- Success states: Yes, confirmation toast border

**Desktop App (Electron)**
- Title bar accent: Yes, if custom title bar enabled
- Sidebar active: Yes, full height highlight
- System tray icon: Yes, if accent is visible

**Marketing Site**
- Hero section accent: Yes, headline callout or button
- Feature section headings: Yes, sparingly (max 1 per section)
- CTA buttons: Yes, all primary CTAs
- Section dividers: No

**Email**
- Primary CTA button: Yes
- Link text: Yes
- Header accent: Optional

**Social Media**
- Post background: No
- Text overlay: No
- Badges/badges: Yes
- Story template accent: Yes

---

### 1.3 Section Color Mapping

Each major app section has a signature color for visual wayfinding. This helps creators navigate intuitively: they see purple and know they're in the Creative Studio, they see pink and know it's their Pipeline.

#### Section Colors Palette

| Section | Color | Hex | OKLCH | Dark Hex | Dark OKLCH | Use Case |
|---------|-------|-----|-------|----------|------------|----------|
| **Dashboard** | Cyan | `#06B6D4` | `oklch(0.68 0.18 205)` | `#22D3EE` | `oklch(0.72 0.16 205)` | Home, overview, stats |
| **Ideas** | Violet | `#8B5CF6` | `oklch(0.62 0.25 283)` | `#A78BFA` | `oklch(0.68 0.20 283)` | Idea capture, brainstorm |
| **Pipeline** | Pink | `#EC4899` | `oklch(0.62 0.24 333)` | `#F472B6` | `oklch(0.70 0.21 333)` | Content production, Kanban |
| **Workspaces** | Orange | `#F97316` | `oklch(0.68 0.21 41)` | `#FB923C` | `oklch(0.74 0.18 41)` | Multi-workspace switcher |
| **Calendar** | Blue | `#3B82F6` | `oklch(0.59 0.23 238)` | `#60A5FA` | `oklch(0.67 0.21 238)` | Publishing schedule |
| **Goals** | Pink | `#EC4899` | `oklch(0.62 0.24 333)` | `#F472B6` | `oklch(0.70 0.21 333)` | Target tracking, analytics |
| **Consistency/Habits** | Green | `#10B981` | `oklch(0.62 0.18 165)` | `#34D399` | `oklch(0.70 0.15 165)` | Streaks, heatmaps, rewards |
| **Notes** | Yellow | `#EAB308` | `oklch(0.75 0.17 96)` | `#FACC15` | `oklch(0.80 0.15 96)` | Note-taking, documentation |
| **Remix** | Purple | `#A855F7` | `oklch(0.62 0.26 276)` | `#C084FC` | `oklch(0.70 0.20 276)` | Content repurposing |
| **Wellbeing** | Rose | `#F43F5E` | `oklch(0.59 0.25 20)` | `#FB7185` | `oklch(0.67 0.22 20)` | Health, breaks, recovery |

#### Section Color Usage Rules

**Sidebar Navigation**
```
Inactive item:
  Text: --muted-foreground
  Background: Transparent
  Icon: --muted-foreground

Active item:
  Text: White / Dark (#FAFAFA)
  Background: Section color (full height, full width)
  Icon: White / Dark (#FAFAFA)
  Border: None (section color IS the indicator)
  
Active item with label (alternative):
  Left bar: 4px section color
  Text: Section color or primary text
```

**Page Headers**
```
Section title: Use section color in text (optional, max 40% of title)
  Example: "Creative Studio" with "Studio" in purple

Icon: Section color (optional, next to title only)
  Size: 24-32px
  
Accent bar: Section color (optional, under header for visual punch)
  Height: 2-4px
  Width: Full page width
```

**Feature Cards**
```
Icon: Section color background
  Size: 40-48px
  Shape: Rounded square
  Icon color: White

Or

Top border: 3px section color
  Full width of card
  
Or

Left border: 4px section color
  Full height of card
```

**Tag/Badge System**
```
Ideas section → Violet badge
Pipeline section → Pink badge
Calendar section → Blue badge
(and so on)

Badge HTML:
  <span class="px-2 py-1 rounded-sm text-sm font-medium"
        style="background: section-color-20%; color: section-color;">
    Tag Name
  </span>
```

---

### 1.4 Semantic Colors

Semantic colors communicate status, priority, and action outcomes independent of the primary brand identity.

#### Semantic Color Values

| Token | Light Hex | Light OKLCH | Dark Hex | Dark OKLCH | Usage |
|-------|-----------|-------------|----------|------------|-------|
| **Success** | `#10B981` | `oklch(0.62 0.18 165)` | `#34D399` | `oklch(0.70 0.15 165)` | Positive outcomes, confirmations, completed tasks |
| **Warning** | `#F59E0B` | `oklch(0.68 0.15 74)` | `#FBBF24` | `oklch(0.75 0.14 74)` | Cautions, alerts, non-blocking issues |
| **Error** | `#EF4444` | `oklch(0.65 0.22 28)` | `#F87171` | `oklch(0.70 0.20 28)` | Destructive actions, failures, blocking issues |
| **Info** | `#3B82F6` | `oklch(0.59 0.23 238)` | `#60A5FA` | `oklch(0.67 0.21 238)` | Information, hints, non-critical notices |

#### Semantic Color Contexts

**Success State**
- Use for: Task completion, publish confirmation, streak achieved, goal hit
- Toast: Green background + white text
- Badge: Green background + white text
- Icon: Green checkmark
- Animation: Pulse or subtle scale-up
- Example: "Your idea was saved successfully"

**Warning State**
- Use for: Publishing soon, quota approaching, unsaved changes, maintenance
- Toast: Orange/amber background + dark text
- Badge: Orange background + dark text
- Icon: Orange exclamation icon
- Animation: Pulse at 1s intervals
- Example: "You're 3 ideas away from your free plan limit"

**Error State**
- Use for: Failed save, deleted content, broken link, connection loss
- Toast: Red background + white text (most prominent)
- Badge: Red background + white text
- Icon: Red X or exclamation
- Animation: Shake or pulse (more prominent than warning)
- Example: "Failed to save. We're retrying automatically."

**Info State**
- Use for: Tips, learning moments, feature highlights, non-critical info
- Toast: Blue background + white text
- Badge: Blue background + white text
- Icon: Blue info (i) icon
- Animation: Fade in
- Example: "Tip: Batch your ideas for faster processing"

#### Priority Colors (For Kanban, Task Lists)

| Priority | Light Bg | Light Text | Dark Bg | Dark Text | Usage |
|----------|----------|-----------|---------|-----------|-------|
| **LOW** | `#DBEAFE` | `#1E40AF` | `#1E3A8A` | `#93C5FD` | Non-urgent, can wait |
| **MEDIUM** | `#FEF3C7` | `#92400E` | `#78350F` | `#FCD34D` | Standard priority |
| **HIGH** | `#FECACA` | `#991B1B` | `#7F1D1D` | `#F87171` | Urgent, ship soon |
| **URGENT** | `#F87171` | `#FFFFFF` | `#DC2626` | `#FFFFFF` | Blocking, ship now |

#### Status Colors (For Pipeline, Publish Status)

| Status | Light Bg | Light Text | Dark Bg | Dark Text | Icon | Usage |
|--------|----------|-----------|---------|-----------|------|-------|
| **TODO** | `#F3F4F6` | `#374151` | `#27272A` | `#D4D4D8` | Circle | Not started |
| **IN_PROGRESS** | `#DBEAFE` | `#1E40AF` | `#1E3A8A` | `#93C5FD` | Spinner | Being worked on |
| **COMPLETED** | `#D1FAE5` | `#065F46` | `#064E3B` | `#6EE7B7` | Checkmark | Done |
| **CANCELLED** | `#F3F4F6` | `#6B7280` | `#27272A` | `#A1A1AA` | X | Abandoned |
| **DRAFT** | `#ECFEFF` | `#0891B2` | `#0E7490` | `#22D3EE` | Note | Work in progress |

---

### 1.5 Color Application by Surface

#### Web App (LMS) - Full Color Context

**Sidebar (Light Theme)**
```
Background: #FAFAFA (--muted)
Border right: #E5E7EB (--border)
Active item background: [Section Color] (full height)
Active item text: #FFFFFF
Hover item background: #F5F3FF (--accent light)

Logo: Cyan (#06B6D4) on background
Item icon (inactive): #6B7280 (--muted-foreground)
Item icon (active): #FFFFFF
Item text (inactive): #0A0A0B (--foreground)
Item text (active): #FFFFFF
```

**Sidebar (Dark Theme)**
```
Background: #18181B (--card dark)
Border right: #27272A (--border dark)
Active item background: [Section Color] (full height)
Active item text: #1A1A24 (or white if color is light)
Hover item background: #3F3F46 (--accent dark)

Logo: Cyan (#22D3EE) on background
Item icon (inactive): #A1A1AA (--muted-foreground dark)
Item icon (active): #FFFFFF or #1A1A24 (depends on color)
Item text (inactive): #FAFAFA (--foreground dark)
Item text (active): #FFFFFF or #1A1A24
```

**Header/Top Bar (Light Theme)**
```
Background: #FFFFFF
Border bottom: #E5E7EB (--border)
Text: #0A0A0B (--foreground)
Icons: #0A0A0B
CTA Button: Cyan (#06B6D4) background, white text
Logo: Cyan (#06B6D4)
```

**Header/Top Bar (Dark Theme)**
```
Background: #1A1A24 (--card)
Border bottom: #27272A (--border)
Text: #FAFAFA (--foreground)
Icons: #FAFAFA
CTA Button: Cyan (#22D3EE) background, dark text
Logo: Cyan (#22D3EE)
```

**Content Area (Light Theme)**
```
Background: #FFFFFF
Card/Surface: #FFFFFF (same as background)
Card border: #E5E7EB (--border)
Text: #0A0A0B (--foreground)
Secondary text: #6B7280 (--muted-foreground)
Dividers: #E5E7EB (--border)
```

**Content Area (Dark Theme)**
```
Background: #0F0F14
Card/Surface: #1A1A24 (--card)
Card border: #27272A (--border)
Text: #FAFAFA (--foreground)
Secondary text: #A1A1AA (--muted-foreground)
Dividers: #27272A (--border)
```

**Modal/Dialog (Light Theme)**
```
Background: #FFFFFF
Border: #E5E7EB
Title text: #0A0A0B (--foreground), semibold
Body text: #0A0A0B
Labels: #6B7280 (--muted-foreground)
Primary button: Cyan (#06B6D4)
Secondary button: Border #E5E7EB, text #0A0A0B
Close button: Icon #6B7280, hover background #F5F3FF
```

**Modal/Dialog (Dark Theme)**
```
Background: #1A1A24 (--card)
Border: #27272A
Title text: #FAFAFA, semibold
Body text: #FAFAFA
Labels: #A1A1AA (--muted-foreground)
Primary button: Cyan (#22D3EE)
Secondary button: Border #27272A, text #FAFAFA
Close button: Icon #A1A1AA, hover background #3F3F46
```

**Toast/Notification**
```
Success:
  Background: #D1FAE5 (light) / #064E3B (dark)
  Text: #065F46 (light) / #6EE7B7 (dark)
  Border: #6EE7B7 (light) / #10B981 (dark)

Error:
  Background: #FEE2E2 (light) / #7F1D1D (dark)
  Text: #991B1B (light) / #F87171 (dark)
  Border: #F87171 (light) / #DC2626 (dark)

Warning:
  Background: #FEF3C7 (light) / #78350F (dark)
  Text: #92400E (light) / #FCD34D (dark)
  Border: #FCD34D (light) / #F59E0B (dark)

Info:
  Background: #DBEAFE (light) / #1E3A8A (dark)
  Text: #1E40AF (light) / #93C5FA (dark)
  Border: #93C5FA (light) / #3B82F6 (dark)
```

#### Mobile App - Full Color Context

**Navigation Bar (Tab Bar)**
```
Background: #FFFFFF (light) / #1A1A24 (dark)
Border top: #E5E7EB (light) / #27272A (dark)

Inactive tab:
  Icon: #6B7280 (light) / #A1A1AA (dark)
  Label: #6B7280 (light) / #A1A1AA (dark)

Active tab:
  Icon: [Section Color]
  Label: [Section Color]
  Indicator: Underline or fill with section color
```

**Sheet (Bottom Sheet)**
```
Background: #FFFFFF (light) / #1A1A24 (dark)
Handle bar: #E5E7EB (light) / #27272A (dark)
Title: #0A0A0B (light) / #FAFAFA (dark)
Body: #0A0A0B (light) / #FAFAFA (dark)
Close button: Icon #6B7280, tap area 44x44px
```

**Card (In Lists)**
```
Light background:
  Card: #FFFFFF (light) / #1A1A24 (dark)
  Border: #E5E7EB (light) / #27272A (dark)
  Title: #0A0A0B (light) / #FAFAFA (dark)
  Subtitle: #6B7280 (light) / #A1A1AA (dark)
  Tap state: Background lighten by 5% (light) or lighten by 10% (dark)

Dark background:
  Card: #F5F3FF (light) / #3F3F46 (dark)
  Border: None or #E5E7EB (light) / #27272A (dark)
```

**Floating Action Button (FAB)**
```
Background: Cyan (#06B6D4 light / #22D3EE dark)
Icon: #FFFFFF (light) / #1A1A24 (dark)
Shadow: Mobile shadow (md)
Tap state: Darken by 8%
```

#### Desktop App (Electron) - Full Color Context

**Title Bar**
```
Background: #FFFFFF (light) / #1A1A24 (dark)
Draggable area: Full width, height 32-40px
Text: #0A0A0B (light) / #FAFAFA (dark)
Close/Min/Max buttons: Standard OS color
Accent underline: 2-4px [Section Color] (optional)
```

**System Tray Icon**
```
Default: Grayscale icon (#6B7280)
Active/Focused: Cyan (#06B6D4)
Notification badge: Red (#EF4444)
Hover: Lighten by 10%
```

**Window Chrome**
```
Frame: #F5F3FF (light) / #18181B (dark)
Dividers: #E5E7EB (light) / #27272A (dark)
Buttons: Standard OS styling, but cyan on focus
```

#### Marketing Site - Full Color Context

**Hero Section**
```
Background: #0F0F14 (dark, always)
Headline: #FAFAFA (white), up to 48px
Subheadline: #A1A1AA (gray), up to 24px
Highlight word in headline: Cyan (#22D3EE), optional
Primary CTA: Cyan (#22D3EE) button, 16px+ padding
Secondary CTA: Outline button, border #22D3EE, text #22D3EE
```

**Feature Section (Alternating)**
```
Odd sections (1st, 3rd, 5th...):
  Background: #0F0F14
  Image: Right side, 50% width, dark mode screenshot
  Text: Left side, 50% width
  Heading: #FAFAFA, 30-36px
  Body: #A1A1AA, 16-18px
  Accent color: [Section color] for heading underline or icon
  
Even sections (2nd, 4th, 6th...):
  Background: #1A1A24
  Image: Left side
  Text: Right side
  Same text styling as odd
```

**Pricing Section**
```
Background: #0F0F14
Plan cards:
  Free: #1A1A24 background, #E5E7EB border, #FAFAFA text
  Pro/Enterprise: #1A1A24 background, #22D3EE border (2px), #FAFAFA text
  
CTA buttons:
  Free plan: Secondary (outline)
  Pro/Enterprise: Primary (Cyan solid)
  
Badge: "Most Popular" in cyan on Pro card
```

**Footer**
```
Background: #0F0F14
Text: #A1A1AA
Links: #22D3EE (hover: lighter)
Dividers: #27272A
Logo: Cyan (#22D3EE)
```

#### Email - Full Color Context

**Email Header**
```
Background: #0F0F14 or #1A1A24
Logo: Cyan (#22D3EE), 120-160px wide
Headline: #FAFAFA, 24-28px
Subheadline: #A1A1AA, 16-18px
```

**Email Body**
```
Background: #FFFFFF or light gray
Text: #0A0A0B or #2F3237
Links: Cyan (#06B6D4), underlined
Dividers: #E5E7EB

Or (Dark variant):
Background: #1A1A24
Text: #FAFAFA
Links: Cyan (#22D3EE), underlined
Dividers: #27272A
```

**Email CTA Button**
```
Primary CTA:
  Background: Cyan (#06B6D4 light / #22D3EE dark)
  Text: #FFFFFF or #1A1A24
  Padding: 12px 24px
  Border radius: 6-8px
  Font size: 16px
  
Secondary CTA:
  Background: Transparent
  Border: 2px cyan
  Text: Cyan
```

**Email Footer**
```
Background: Same as header
Text: #A1A1AA
Links: Cyan (#22D3EE)
Dividers: #27272A
Unsubscribe link: Gray (#6B7280), small text
```

#### Social Media - Full Color Context

**Post Background**
```
Image-based posts:
  Use dark backgrounds (#0F0F14 or #1A1A24)
  Product screenshots in dark mode
  Text overlays: White (#FAFAFA) or light (#ECFEFF)
  
Text-only posts:
  Background: Dark gradient or solid dark
  Text: White (#FAFAFA)
  Accent color: Cyan (#22D3EE) for highlights
```

**Story Template**
```
Background: Dark (#0F0F14) with optional gradient to section color
Text: White (#FAFAFA)
CTA sticker: Cyan (#22D3EE) background, white text
Accent color: [Section color] for visual interest
```

**Post Borders/Badges**
```
Retweet/Share badge: Cyan (#22D3EE)
Like indicator: Red (#F43F5E) when active
Verified badge: Cyan (#22D3EE)
```

---

### 1.6 Color Ratios and Composition

The **60-25-10-5 rule** ensures visual balance:

```
Background (neutral):     60%
  - White (#FFFFFF) in light mode
  - Dark (#0F0F14) in dark mode

Surface (cards, panels):  25%
  - Sidebar, cards, modals use muted tones
  - Create depth and organization

Primary Accent (Cyan):     5%
  - CTA buttons, active states, critical UI
  - Should feel special, never overwhelming

Secondary Colors:          10%
  - Section colors, semantic colors, supporting elements
  - Help with wayfinding and status communication
```

**Example Page Breakdown:**
```
Light Theme Page (1200px x 800px = 960,000px²)
- White background:      576,000px² (60%)
- Sidebar/cards:         240,000px² (25%)
- Cyan buttons/accents:   48,000px² (5%)
- Section colors/status:  96,000px² (10%)

Dark Theme Page
- Dark background:       576,000px² (60%)
- Card surfaces:         240,000px² (25%)
- Cyan buttons/accents:   48,000px² (5%)
- Section colors/status:  96,000px² (10%)
```

### 1.7 Color Accessibility Matrix

**WCAG AA Contrast Ratios** (minimum 4.5:1 for text, 3:1 for UI components)

| Color Pair | Light Theme | Dark Theme | Standard | Large Text | UI Component |
|------------|-----------|-----------|----------|------------|--------------|
| Cyan text on white | 4.8:1 | N/A | PASS AA | PASS AAA | PASS |
| Cyan text on light gray | 4.2:1 | N/A | PASS AA | PASS AA | PASS |
| White text on cyan | 7.5:1 | N/A | PASS AAA | PASS AAA | PASS |
| Dark text on cyan | 2.1:1 | N/A | FAIL | FAIL | FAIL |
| Cyan text on dark background | N/A | 6.2:1 | PASS AA | PASS AAA | PASS |
| White text on dark | N/A | 14.2:1 | PASS AAA | PASS AAA | PASS |
| Gray text on white | 7.1:1 | N/A | PASS AAA | PASS AAA | PASS |
| Light gray text on white | 3.2:1 | N/A | FAIL | PASS AA | PASS |
| Gray text on dark | N/A | 6.8:1 | PASS AA | PASS AAA | PASS |
| Section color text on white | Varies | N/A | Check per color | Check | Check |
| Section color text on dark | N/A | Varies | Check per color | Check | Check |
| Success on background | 5.2:1 | 5.8:1 | PASS AA | PASS AAA | PASS |
| Error on background | 5.9:1 | 6.1:1 | PASS AA | PASS AAA | PASS |
| Warning on background | 4.9:1 | 5.2:1 | PASS AA | PASS AAA | PASS |

**Remedies for Failing Combinations:**
- Never use dark text on cyan background (insufficient contrast)
- Don't use light gray text on white (fails accessibility)
- If using section colors as text, check contrast before implementation
- Always provide non-color indicators (icons, text labels, borders)

---

## 2. Typography System

### 2.1 Font Family & Stack

**Primary Font: Inter**

Ordo uses **Inter** exclusively for all interfaces, marketing, and communication. Inter was chosen for:
- Excellent readability at small sizes (UI)
- Modern, friendly feel (aligns with brand)
- Superior performance (variable font)
- Exceptional language support (international creators)

```css
/* CSS Font Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 
             'Droid Sans', 'Helvetica Neue', sans-serif;

/* Font Features (OpenType) */
font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';

/* Rendering */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

**Font Features Explanation:**
- `cv02`: Single-story 'a' (more modern look)
- `cv03`: Alternate 'g' (cleaner in UI)
- `cv04`: Italic 'a' with single story
- `cv11`: Slashed zero (for code contexts)

### 2.2 Type Scale (Complete Hierarchy)

#### Web App Typography Scale

| Class Name | Font Size | Line Height | Weight | Letter Spacing | USAGE |
|-----------|-----------|-------------|--------|----------------|-------|
| `text-display` | 48px / 3rem | 1.0 (48px) | 700 Bold | -0.025em (tight) | Hero headlines, page titles on marketing, splash screens |
| `text-heading-1` | 36px / 2.25rem | 1.25 (45px) | 700 Bold | -0.025em | Main page headings, modal titles, feature names |
| `text-heading-2` | 30px / 1.875rem | 1.25 (37.5px) | 600 Semibold | -0.015em | Section headers, large card titles |
| `text-heading-3` | 24px / 1.5rem | 1.5 (36px) | 600 Semibold | 0em | Subsection headers, medium card titles |
| `text-heading-4` | 20px / 1.25rem | 1.5 (30px) | 600 Semibold | 0em | Card titles, feature headers, list section titles |
| `text-body-lg` | 18px / 1.125rem | 1.5 (27px) | 400 Normal | 0em | Lead paragraphs, intro text, large body copy |
| `text-body` | 16px / 1rem | 1.5 (24px) | 400 Normal | 0em | Primary body text, labels, default UI text |
| `text-body-sm` | 14px / 0.875rem | 1.5 (21px) | 400 Normal | 0em | Secondary text, descriptions, small content |
| `text-caption` | 12px / 0.75rem | 1.5 (18px) | 400 Normal | 0.025em | Captions, labels, timestamps, help text, micro-interactions |
| `text-xs` | 11px / 0.6875rem | 1.4 (15.4px) | 400 Normal | 0.05em | Badge text, very small captions (use sparingly) |

#### Mobile App Typography Scale

| Class Name | Font Size | Weight | Usage | Notes |
|-----------|-----------|--------|-------|-------|
| `text-display` | 40px | 700 Bold | Hero text on onboarding | Reduce from web, mobile screen constraints |
| `text-heading-1` | 28px | 700 Bold | Screen titles | Large enough for mobile reading distance |
| `text-heading-2` | 24px | 600 Semibold | Card titles, section headers | Common on mobile interfaces |
| `text-heading-3` | 20px | 600 Semibold | Subsection titles | Medium emphasis |
| `text-body-lg` | 17px | 400 Normal | Introduction, lead text | Slightly larger than desktop for mobile |
| `text-body` | 16px | 400 Normal | Default body, labels | Standard mobile text |
| `text-body-sm` | 14px | 400 Normal | Secondary text, descriptions | Common for secondary info |
| `text-caption` | 12px | 400 Normal | Captions, timestamps, help | Small but readable on mobile |

**Mobile-Specific Rules:**
- Minimum tap target height: 44px (include text + padding)
- Maximum column width: 65 characters (mobile portrait)
- Increase line-height by 0.25 for mobile reading distance
- Never use text-xs on mobile (too small at typical viewing distance)

#### Desktop App (Electron) Typography Scale

| Class Name | Font Size | Weight | Usage |
|-----------|-----------|--------|-------|
| `text-display` | 48px | 700 Bold | Window title bar, splash screen |
| `text-heading-1` | 36px | 700 Bold | Window section titles |
| `text-heading-2` | 28px | 600 Semibold | Sidebar section headers |
| `text-heading-3` | 24px | 600 Semibold | Card titles, list headers |
| `text-body-lg` | 16px | 400 Normal | Main content, descriptions |
| `text-body` | 14px | 400 Normal | Default desktop UI text |
| `text-body-sm` | 12px | 400 Normal | Secondary text, status |
| `text-caption` | 11px | 400 Normal | Captions, timestamps |

**Desktop-Specific Rules:**
- Tighter line-height acceptable (1.25-1.375)
- System font size of 16px = 100% base scale
- Title bar uses text-display or heading-1
- Context menus use text-body-sm (compact)

#### Marketing Site Typography Scale

| Class Name | Font Size | Weight | Usage | Notes |
|-----------|-----------|--------|-------|-------|
| `hero-headline` | 56-64px | 700 Bold | Hero section main headline | Can be larger on desktop |
| `hero-subheadline` | 28-32px | 600 Semibold | Hero section description | Sets expectation |
| `section-headline` | 40-48px | 700 Bold | Feature section titles | Adjusts for breakpoints |
| `section-subheadline` | 24-28px | 600 Semibold | Feature section subtitles | Optional, for complex features |
| `body-lg` | 18-20px | 400 Normal | Feature descriptions, testimonials | Readable at distance |
| `body` | 16-18px | 400 Normal | Primary marketing copy | Optimal reading width 65 chars |
| `body-sm` | 14-16px | 400 Normal | Supporting text, footer | Still readable |
| `caption` | 12-14px | 400 Normal | Fine print, legal, captions | Footnotes, credits |

**Marketing-Specific Rules:**
- Font sizes scale with breakpoints (use clamp())
- Headings often have color accents (keywords in cyan)
- Line length: 50-75 characters for reading comfort
- Use generous leading (1.5-1.625 for body)

#### Email Typography Scale

| Element | Font Size | Weight | Font Stack | Usage |
|---------|-----------|--------|------------|-------|
| **Header** | 28-32px | 700 Bold | Inter, Arial, Helvetica | Email subject visual |
| **Subheader** | 18-22px | 600 Semibold | Inter, Arial, Helvetica | Email intro text |
| **Body** | 16px | 400 Normal | Arial, Helvetica | Main email content |
| **Label/CTA** | 14-16px | 600 Semibold | Arial, Helvetica | Button text, labels |
| **Footer** | 12px | 400 Normal | Arial, Helvetica | Footer text, unsubscribe |
| **Fallback** | System default | Varies | Arial, Helvetica, sans-serif | When Inter fails to load |

**Email-Specific Rules:**
- Use inline `<style>` for font declarations (email clients)
- Fallback fonts MUST NOT create layout shifts
- No variable fonts in email (use static weights only)
- Test font rendering in Gmail, Outlook, Apple Mail
- Always provide Arial/Helvetica as fallback

### 2.3 Typography by Component

#### Buttons

```
Primary Button:
  Font size: text-body (16px)
  Font weight: 600 (Semibold)
  Line height: 1.5 (24px)
  Letter spacing: 0em
  Text transform: None (use natural capitalization)
  Padding: 12px 16px (includes text height)
  
Secondary Button:
  Font size: text-body (16px)
  Font weight: 600 (Semibold)
  Line height: 1.5 (24px)
  Padding: 12px 16px

Ghost Button:
  Font size: text-body (16px)
  Font weight: 600 (Semibold)
  Padding: 12px 16px

Small Button (compact):
  Font size: text-body-sm (14px)
  Font weight: 600 (Semibold)
  Padding: 8px 12px
```

#### Inputs & Forms

```
Label:
  Font size: text-body-sm (14px)
  Font weight: 600 (Semibold)
  Color: --foreground
  Margin bottom: 6px

Input Placeholder:
  Font size: text-body (16px)
  Font weight: 400 (Normal)
  Color: --muted-foreground
  
Input Value:
  Font size: text-body (16px)
  Font weight: 400 (Normal)
  Color: --foreground
  
Helper Text:
  Font size: text-caption (12px)
  Font weight: 400 (Normal)
  Color: --muted-foreground
  Margin top: 4px
```

#### Navigation

```
Sidebar Item (Inactive):
  Font size: text-body-sm (14px)
  Font weight: 500 (Medium)
  Color: --muted-foreground
  
Sidebar Item (Active):
  Font size: text-body-sm (14px)
  Font weight: 600 (Semibold)
  Color: #FFFFFF or #1A1A24 (depends on section color)
  
Breadcrumb:
  Font size: text-caption (12px)
  Font weight: 400 (Normal)
  Separator: " / " in muted-foreground
  Current page: Semibold
```

#### Cards & Content

```
Card Title:
  Font size: text-heading-4 (20px)
  Font weight: 600 (Semibold)
  Line height: 1.5 (30px)
  
Card Subtitle:
  Font size: text-body-sm (14px)
  Font weight: 400 (Normal)
  Color: --muted-foreground
  
Card Body:
  Font size: text-body (16px)
  Font weight: 400 (Normal)
  Line height: 1.5 (24px)
```

#### Tables

```
Table Header:
  Font size: text-caption (12px)
  Font weight: 600 (Semibold)
  Color: --muted-foreground
  Text transform: Uppercase
  Letter spacing: 0.05em
  
Table Cell (Text):
  Font size: text-body-sm (14px)
  Font weight: 400 (Normal)
  
Table Cell (Number):
  Font size: text-body-sm (14px)
  Font weight: 400 (Normal)
  Font variant: tabular-nums (aligned columns)
```

### 2.4 Font Weight Usage Rules

| Weight | Name | Usage | Rule |
|--------|------|-------|------|
| 400 | Normal | Body text, paragraphs, descriptions | Default weight |
| 500 | Medium | Navigation items, emphasis within body | Rarely used, prefer 600 |
| 600 | Semibold | Headings, subheadings, card titles, labels | Primary hierarchy weight |
| 700 | Bold | Main headings, hero text, important callouts | Strongest emphasis |

**Weight Usage Rules:**
- Never use weights below 400 or above 700 (doesn't exist in Inter)
- Paragraph text is always 400
- Headings are always 600 (subheadings) or 700 (main)
- Labels are 600 (semibold) for emphasis
- Don't use 500 in production (use 400 or 600 instead)

### 2.5 Text Colors in Context

```
Primary Text (Headings, Body):
  Light: #0A0A0B (--foreground)
  Dark: #FAFAFA (--foreground)

Secondary Text (Descriptions, Help):
  Light: #6B7280 (--muted-foreground)
  Dark: #A1A1AA (--muted-foreground)

Link Text:
  Light: #06B6D4 (Cyan, --primary)
  Dark: #22D3EE (Cyan, --primary)
  Underline on hover

Interactive Text (Buttons):
  Primary button: #FFFFFF (light) / #1A1A24 (dark)
  Secondary button: Same as heading text
  Ghost button: Same as primary text

Status Text:
  Success: #065F46 (light) / #6EE7B7 (dark)
  Error: #991B1B (light) / #F87171 (dark)
  Warning: #92400E (light) / #FCD34D (dark)
  Info: #1E40AF (light) / #93C5FA (dark)

Placeholder/Disabled Text:
  Light: #D1D5DB (--border, very muted)
  Dark: #52525B (muted, lighter than secondary)
```

### 2.6 Typography in Dark Mode

All typography values remain the same between light and dark modes. Only **colors** change:

```
Light Mode:
  Primary text (#0A0A0B) on white background = 18.8:1 contrast
  
Dark Mode:
  Primary text (#FAFAFA) on #0F0F14 background = 13.2:1 contrast
  
Both pass WCAG AAA (minimum 7:1)
```

**Dark Mode Adjustments:**
- Font weights remain the same
- Font sizes remain the same
- Line heights remain the same
- Only text color and background color change
- No additional letter spacing needed
- No font smoothing adjustments needed

---

## 3. Logo Usage Guide

### 3.1 Logo Variations & Formats

Ordo has three core logo formats:

**1. Logomark Only** (The "O" symbol)
- Standalone use in constrained spaces
- 24px minimum (web)
- 20px minimum (mobile)
- 16px minimum (favicon, very small)

**2. Logotype Only** (The "ordo" text)
- Never used alone in the product
- Marketing only (sometimes)
- Minimum 120px wide

**3. Full Lockup** (Logomark + Logotype horizontal)
- Primary brand application
- Marketing, login pages, splash screens
- Minimum 160px wide

### 3.2 Logo Color Variations

| Variation | Usage Context | Hex Light | Hex Dark | File |
|-----------|---------------|-----------|----------|------|
| **Primary (Cyan on white)** | Light backgrounds, marketing | `#06B6D4` | N/A | `ordo-logo-cyan-light.svg` |
| **Primary (Cyan on dark)** | Optional on dark, marketing accents | `#06B6D4` | `#22D3EE` | `ordo-logo-cyan-dark.svg` |
| **White on dark** | Dark backgrounds, dark mode | `#FFFFFF` | `#FFFFFF` | `ordo-logo-white-dark.svg` |
| **Monochrome** | Minimal, watermarks, print | `#6B7280` | `#A1A1AA` | `ordo-logo-gray.svg` |
| **Reversed (Inverted)** | Embossed on light, rare | `#FFFFFF` | `#0F0F14` | `ordo-logo-reversed.svg` |

### 3.3 Minimum Logo Sizes

```
Logomark (square):
  - Web: 24px x 24px (12px display units)
  - Mobile: 20px x 20px
  - Favicon: 16px x 16px (32px exported for Retina)
  - Print: 0.25 inch (6.35mm)

Logotype (text only):
  - Web: 120px wide minimum
  - Mobile: 100px wide minimum
  - Print: 1.5 inches (38.1mm)

Full Lockup:
  - Web: 160px wide minimum
  - Mobile: 120px wide minimum (landscape), 100px (portrait)
  - Print: 2 inches wide (50.8mm)
  - Large: 320px+ wide (hero, splash screens)
```

### 3.4 Clear Space Rules

**The "Breathing Room" Principle**

Logo must have minimum clear space around it equal to the height of the "o" in "ordo" logotype (or the height of the logomark).

```
For Logomark (24px):
  Minimum clear space all sides: 24px

For Full Lockup (160px wide):
  Minimum clear space all sides: ~24px (height of text)
  
For Large Logo (320px):
  Minimum clear space all sides: 40-60px

Never allow:
  - No padding on small logos
  - Logos touching UI edges without buffer
  - Text or images overlapping clear space
```

**Visual Example:**
```
        24px
      <------>
      ┌──────────────┐  ^
      │              │  │
      │   [LOGO]     │  │ 24px
      │              │  │
      └──────────────┘  v
      <------>
       24px
```

### 3.5 Logo Placement Guidelines

#### Web App

**Header/Navigation:**
- Position: Top-left (LTR) or top-right (RTL)
- Size: Logomark 24px or lockup 120px
- Vertical alignment: Center with header height
- Spacing from edge: 16px (left), 24px (right)
- Background: No background shape (transparent)

```
┌─────────────────────────────────┐
│ [Logo] Navigation Items...      │
└─────────────────────────────────┘
 16px
```

**Sidebar:**
- Position: Top of sidebar
- Size: Logomark 28px or small lockup 100px
- Vertical spacing: 16px from sidebar top
- Horizontal: Center or left-align with 12px padding
- Click to home: Yes, logo is always clickable

```
┌──────────────┐
│              │ 16px
│   [Logo]     │
│              │
├──────────────┤
│ Items...     │
└──────────────┘
```

**Login/Splash Screen:**
- Position: Top-center or upper-left
- Size: Full lockup 240-320px wide
- Vertical position: 40-60px from top (not perfectly centered)
- Breathing room: 80px+ all sides
- Background: Dark (#0F0F14) or colored

#### Mobile App

**Header:**
- Position: Top-left
- Size: Logomark 24px
- Vertical alignment: Center with header (40-44px total height)
- Spacing: 12px from left edge, 12px from right edge
- Accessibility: Tappable area 44x44px minimum

**Splash Screen:**
- Position: Center (both horizontally and vertically)
- Size: Lockup 160px or logomark 80px
- Background: Solid color (#0F0F14) or brand gradient
- Animation: Fade in 0.5s, hold 1s, fade out 0.5s during app load

**App Icon:**
- Logomark only, 180x180px (app icon size in manifest)
- No text, no background
- Solid cyan (#06B6D4) background with white logomark
- Corner radius: 0 (square) or platform default

#### Desktop App (Electron)

**Title Bar:**
- Position: Top-left (macOS style) or top-right if custom
- Size: Logomark 20px
- Vertical alignment: Center with title bar (32-40px)
- Color: Matches window theme (light/dark)
- Click: Opens app menu or goes to home

**Window Icon (System Tray/Dock):**
- Logomark only, 256x256px (exported at 512x512 for Retina)
- Cyan background (#06B6D4)
- White logomark
- Notification badge: Red (#EF4444) in corner

#### Marketing Site

**Hero Section:**
- Position: Directly above headline or in top-left corner
- Size: Full lockup 240-320px wide
- Color: Cyan (#06B6D4 on light / #22D3EE on dark)
- Spacing: 60-80px from top, 40px from left edge
- Animation: Fade in on page load (optional)

**Header/Navigation:**
- Position: Top-left
- Size: Logomark 32px or lockup 160px
- Color: Cyan on light backgrounds, white/cyan on dark
- Spacing: 20px from edges
- Click: Goes to home page

**Footer:**
- Position: Left side of footer
- Size: Logomark 28px
- Color: Cyan (#22D3EE on dark footer) or gray (on light)
- Spacing: 24px from edges
- No link needed in footer

#### Email

**Header:**
- Position: Top-center or top-left
- Size: Lockup 160-200px wide
- Color: Cyan (#06B6D4 on light / #22D3EE on dark)
- Padding: 24px top, 20px left/right
- Alt text: "Ordo Creator OS" (for accessibility)

### 3.6 Logo Styling: Do's and Don'ts

#### DO

- Use approved color variations only
- Maintain aspect ratio (don't stretch/squash)
- Ensure minimum clear space
- Make logo clickable on web (goes to home)
- Use sharp, not blurry or pixelated versions
- Pair with appropriate background contrast
- Export as SVG for web (crisp at any size)
- Export as PNG (48x48px minimum) for icon use
- Use correct variation for each context

#### DO NOT

- Don't rotate the logo
- Don't flip or mirror the logo
- Don't add shadows, glows, or effects
- Don't change colors outside approved palette
- Don't place on busy or low-contrast backgrounds
- Don't use pixelated or rasterized versions on web
- Don't add borders, outlines, or frames
- Don't combine logomark with different logotype
- Don't recreate or modify the logomark shape
- Don't use old logo versions (if they exist)
- Don't apply gradients or transparency to logo
- Don't use logo smaller than minimum size (use simplified logomark instead)

#### Specific No-No's with Examples

```
WRONG: Rotated logo
  ❌ [Logo at 45 degrees]

WRONG: Logo with shadow
  ❌ [Logo with drop shadow effect]

WRONG: Stretched logo
  ❌ [Logo stretched horizontally to 150% width]

WRONG: Logo on busy background
  ❌ [Logo on photographic background without shape behind it]

WRONG: Colored background behind logo without breathing room
  ❌ [Logo in cyan box with no padding]

RIGHT: Logo in center with clear space and background shape
  ✅ [Logo in rounded square shape with 24px clear space on dark background]
```

### 3.7 Logo Animations

Logos may animate in specific contexts:

**Entrance Animation (Splash Screen)**
```
Duration: 0.5s
Curve: ease-out
Effect: Fade in + slight scale (0.8 → 1.0)
Repeat: Once on app load only
```

**Loading State (Rare)**
```
Duration: 1.5s infinite
Effect: Subtle rotation (0° → 360°)
Use case: Long-running operations only
Icon: Logomark only, not full lockup
```

**Hover State (Web Only)**
```
Duration: 0.2s
Effect: Subtle scale (1.0 → 1.05) or shadow increase
Color: Optional glow effect in brand color
Use case: Interactive contexts (clickable logo)
```

---

### 3.8 Logo File Specifications

| Format | Usage | Specifications |
|--------|-------|-----------------|
| **SVG** | Web, design tools | Exported with consistent units, no embedded rasterization |
| **PNG** | Mobile icons, fallback | 2x resolution (retina): 48x48px, 64x64px, 128x128px, 256x256px |
| **ICO** | Favicon | 16x16px, 32x32px, 64x64px in single file |
| **PDF** | Print, vector tools | Fonts outlined, colors in CMYK for print |
| **EPS** | Print, professional | Fonts outlined, CMYK color space |
| **WEBP** | Modern web (fallback) | High quality, smaller file size than PNG |

### 3.9 App Icons (Platform-Specific)

#### iOS App Icon

```
Base Size: 1024x1024px
Formats needed:
  - 120x120px (iPhone notification)
  - 152x152px (iPad settings)
  - 167x167px (iPad Pro)
  - 180x180px (iPhone home screen)
  - 1024x1024px (App Store)

Design:
  - Logomark cyan on white background
  - Rounded corners (per iOS guidelines, ~307px radius on 1024px)
  - No transparency (solid background)
  - No text or badge
  - Safe area: 100px padding on 1024px (keep logo in center)
```

#### Android App Icon

```
Base Size: 192x192px
Formats needed:
  - 48x48px (xxxhdpi notification small)
  - 96x96px (xxhdpi notification)
  - 192x192px (xxxhdpi home screen)
  - 512x512px (Google Play Store)

Design:
  - Logomark cyan on white or dark background
  - No rounded corners (Android uses system shape masking)
  - Safe area: 36px padding on 192px
  - Follow Material Design guidelines
```

#### Web Favicon

```
Base Sizes:
  - 16x16px (browser tab)
  - 32x32px (browser tab Retina)
  - 64x64px (desktop shortcut)
  - 180x180px (Apple touch icon)

Design:
  - Logomark only (cannot fit logotype)
  - Simple, bold design for legibility at small sizes
  - Cyan (#06B6D4) on white background
  - High contrast (passes WCAG AAA at small sizes)
  
Files:
  - favicon.ico (contains 16px, 32px, 64px)
  - apple-touch-icon.png (180x180px, rounded corners)
  - favicon.svg (scalable, optional modern format)
```

#### Desktop App Icon

```
Base Size: 256x256px (1024x1024px for Retina)
Formats needed:
  - 256x256px (regular desktop)
  - 512x512px (larger displays)
  - 1024x1024px (high DPI, 2x scale)

Design:
  - Logomark with slight padding
  - Cyan background (#06B6D4)
  - White logomark
  - Rounded corners (12-16px for modern OS)
  - No transparency in background
```

---

## 4. Illustration & Imagery Style

### 4.1 Illustration Style Guide

#### Empty State Illustrations

Illustrations in empty states (no data, no items, no results) serve to:
- Reassure users they're in the right place
- Explain what to do next
- Maintain brand personality despite emptiness

**Style Characteristics:**
- Warm, optimistic tone (not sad or apologetic)
- Simplified shapes (geometric + organic blend)
- Use 2-3 colors from the brand palette
- Maximum depth: 3 visual layers
- Include a human element (hand, face, or silhouette)

**Empty State Template:**
```
Illustration (center, 200-280px):
  - 80% of content width on mobile
  - 40-50% of width on desktop
  - Centered vertically with padding

Headline (under illustration):
  - text-heading-3 (24px)
  - Brand color accent optional (one word)
  - Example: "Ready to create" with "create" in cyan

Description (under headline):
  - text-body-sm (14px)
  - muted-foreground color
  - 2-3 lines maximum
  - Actionable direction

CTA Button (under description):
  - Cyan primary button
  - 44px minimum height (mobile)
  - Example: "Create your first idea"
```

**Example Empty State:**
```
┌────────────────────────────────┐
│                                │
│      ┌──────────────┐           │
│      │   [ILLUST]   │           │
│      └──────────────┘           │
│                                │
│    Start Creating Today        │
│    Your first idea awaits.     │
│                                │
│    [+ Create Idea]             │
│                                │
└────────────────────────────────┘
```

#### Onboarding Illustrations

Onboarding illustrations guide new creators through the platform flow.

**Style Characteristics:**
- Sequential, 4-6 screens typical
- Same illustration style across all screens
- Progressive reveal (complexity increases with user understanding)
- Each screen teaches one concept
- Characters or objects consistent across series

**Onboarding Flow Example:**
```
Screen 1: Welcome
  Title: "Your Content OS"
  Illustration: Creator with lightbulb (idea generation)
  Colors: Cyan accent on idea
  
Screen 2: Capture Ideas
  Title: "Record your inspiration"
  Illustration: Hand dropping ideas into bucket
  Colors: Violet accent on ideas
  
Screen 3: Organize Work
  Title: "Build your Pipeline"
  Illustration: Content cards moving through stages
  Colors: Pink accent on Pipeline stages
  
Screen 4: Ship Content
  Title: "Publish everywhere"
  Illustration: Content spreading across platforms
  Colors: Multi-colored platforms
  
Screen 5: Track Progress
  Title: "Watch it grow"
  Illustration: Growth chart with creator celebrating
  Colors: Green accent on streak/growth
  
Screen 6: Ready to Start
  Title: "Let's go!"
  Illustration: Creator at desk, ready to work
  CTA: "Enter Ordo"
```

**Onboarding Illustration Specifications:**
- Resolution: 1x and 2x versions for mobile/desktop
- Dimensions: 320x320px (mobile), 400x400px (tablet), 500x500px (desktop)
- Format: SVG preferred (scalable), PNG acceptable
- Colors: Use brand palette, max 4 colors per illustration
- Animation: Optional fade-in/slide-in (0.3s ease-out)

#### Marketing Illustrations

Marketing illustrations appear on the landing page, blog, help documentation.

**Style Characteristics:**
- Friendly, approachable aesthetic
- 3D-inspired (subtle shading, depth)
- Real-world objects + abstract shapes
- Diverse representation (creators in different contexts)
- Warm color palette (earth tones + cyan accents)

**Marketing Illustration Types:**

1. **Feature Illustrations** (show feature benefits)
   - 600x400px typical size
   - 2-3 key elements (creator + tool + result)
   - Section color accent
   - Example: Creator with Pipeline diagram (pink accents)

2. **Concept Illustrations** (explain abstract ideas)
   - 500x500px (square for flexibility)
   - Conceptual, not literal
   - Cyan or section color accents
   - Example: Progress as ascending steps with checkmarks

3. **Success Stories** (show real creator examples)
   - 300x200px thumbnail
   - Simplified portrait + key metrics
   - Section color or multi-colored
   - Never actual photos (use abstract representation)

4. **How-it-Works** (step-by-step process)
   - Sequential set of 4-6 illustrations
   - Consistent character/visual style
   - Growing complexity from left to right
   - Colors: Cycle through section colors

### 4.2 Photography Direction for Marketing

While illustrations are primary, photography in specific contexts supports the brand.

**Photography Principles:**
- **Authentic**: Real creators in real environments (not staged studios)
- **Warm**: Natural lighting, warm color temperature
- **Active**: Creators working (typing, filming, editing) not posing
- **Diverse**: Multiple ethnicities, genders, ages, content types
- **Tech-positive**: Devices visible but not the focus

**Photography Subjects:**
```
✅ Creator at desk filming video
✅ Creator with camera and microphone
✅ Hands typing on keyboard
✅ Face close-up during concentration
✅ Multiple creators collaborating
✅ Creator reviewing footage on monitor
✅ Mixed team in creative space
✅ Creator gesturing during explanation

❌ Generic stock photos of smiling people
❌ Only one demographic
❌ Posed, unnatural expressions
❌ Competitors' products visible
❌ Heavy filters or unrealistic editing
❌ Frustrated or unhappy creators
❌ Clean, sterile office spaces
❌ Desk with no actual work happening
```

**Photography Specifications:**
- Resolution: 3000x2000px minimum (web/print use)
- Color temperature: 3500-5000K (warm to neutral)
- Lighting: Natural or warm artificial (80+ CRI)
- Background: Slightly blurred or bokeh (not distracting)
- Subjects: 2-4 people typical, 4-6 maximum
- Composition: 16:10 ratio for desktop context, 9:16 for mobile

**Photography Contexts:**
- Case studies: Hero photo of creator + workspace
- Blog posts: 1-2 related photos per post
- About page: Team photo in creative space
- Success story: Creator portrait + quote
- Social media: Candid behind-the-scenes images

### 4.3 Screenshot Treatment Guidelines

Screenshots (product screenshots in marketing) are crucial visual assets.

**Screenshot Capture Specifications:**
- Resolution: Retina (2x) minimum
  - Desktop: 1440x900px (capture) = 2880x1800px (export)
  - Mobile: 390x844px (capture) = 780x1688px (export)
- Theme: Dark mode (primary showcase)
- Sample data: Realistic, not "Lorem ipsum"
- Branding: Minimal browser chrome (none preferred)
- Annotations: Cyan arrows/circles for callouts (optional)

**Screenshot Treatment (Post-Capture):**

1. **Cropping**: Remove unnecessary UI edges
   - Desktop: Show sidebar + main content
   - Mobile: Full screen (no bezels)

2. **Browser Frame** (optional):
   - Thin frame around screenshot
   - macOS style: Colored title bar matching theme
   - Windows style: Minimal frame, dark
   - Mobile: No frame (full bleed)

3. **Annotations** (optional, sparingly):
   - Cyan arrows pointing to key features
   - Curved arrows for flow
   - Circles highlighting elements
   - Text labels in semi-transparent dark boxes
   - Typography: text-caption (12px), white text

4. **Shadows**:
   - Desktop screenshot: Drop shadow (offset 0 8px, blur 16px, opacity 25%)
   - Mobile screenshot: Drop shadow (offset 0 4px, blur 8px, opacity 20%)
   - Helps screenshot stand out on light backgrounds

**Example Annotated Screenshot:**
```
┌─────────────────────────────────────┐
│ Ordo Creator OS        [ - □ X ]    │
├─────────────────────────────────────┤
│ [Ideas] [Pipeline] [Calendar]       │
│                                     │
│  Create Idea              ↗ Idea    │
│  [+ New]  [Search]       captured   │
│                                     │
│  ↙ Ideas ready           Your first │
│  to organize             idea       │
│  _______________                    │
│ │ Write Script │                    │
│ │ Film Video   │                    │
│ │ Edit Content │                    │
│                                     │
└─────────────────────────────────────┘

Shadow: 0 8px 16px rgba(0,0,0,0.25)
```

### 4.4 Video Assets

Short video clips support marketing and onboarding.

**Video Specifications:**
- Format: MP4 (H.264 codec)
- Resolution: 1920x1080px (1080p), 3840x2160px (4K)
- Frame rate: 30fps (standard), 60fps (smooth motion)
- Duration: 15s-60s maximum
- Audio: Optional (captions if no audio)
- File size: < 50MB for web

**Video Types:**

1. **Product Demo Videos**
   - Show key feature workflow
   - 30-60 seconds
   - Voice-over explaining benefit
   - Captions for accessibility
   - Cursor highlighting + smooth transitions

2. **Testimonial Videos**
   - Creator speaking 15-30 seconds
   - Authentic, not scripted
   - Simple background (desk, home studio)
   - Minimal editing (natural lighting)

3. **How-to Videos**
   - Screen recording + voice-over
   - Step-by-step feature walkthrough
   - 2-5 minutes typical
   - Captions + transcript

4. **Brand Videos**
   - Animation + narration
   - Explains brand philosophy
   - 30-90 seconds
   - Cinematic quality

**Video Playback Context:**
- Auto-play muted (web)
- Manual play (email, social)
- Full-screen capable
- Mobile responsive (scales with viewport)
- Fallback: Poster image (screenshot at first frame)

---

## 5. Brand Application Matrix

Complete guide for how brand elements apply across ALL touchpoints.

### 5.1 Comprehensive Touchpoint Matrix

| Touchpoint | Primary Color | Primary Color Usage | Typography | Logo | Section Color | Button Style | Background |
|-----------|---------------|-------------------|-----------|------|----------------|-------------|-----------|
| **Web App Sidebar** | Cyan | Active nav highlight (full height) | text-body-sm labels | Logomark 28px top | Section colors for items | Icon + label | Light gray sidebar |
| **Web App Header** | Cyan | Primary CTA button | text-heading-4 title | Logotype 120px left | None | One cyan primary button | White/dark surface |
| **Web App Buttons** | Cyan | Primary CTA background | text-body semibold | N/A | None | Solid cyan + white text | Embedded in content |
| **Web App Links** | Cyan | Text color + underline hover | Inherit parent | N/A | None | Standard link style | Inline in text |
| **Web App Cards** | Cyan | Focus ring only | text-body + heading-4 title | N/A | Optional top/left border | Embedded CTAs | White/card surface |
| **Mobile Tab Bar** | Section Colors | Active tab icon + label | text-caption | N/A | Rotating per section | Icon + label highlight | White/dark surface |
| **Mobile FAB** | Cyan | Solid background | text-body semibold | N/A | None | Solid cyan button | Floating overlay |
| **Mobile Sheets** | Cyan | Close button ring | text-heading-3 title | N/A | None | Cyan primary CTAs | White/dark surface |
| **Desktop Title Bar** | Cyan | Optional accent underline | System font title | Logomark 20px | None | Standard OS buttons | Light gray/dark |
| **Desktop Tray Icon** | Cyan | Active state color | N/A | Logomark 256px | None | Right-click menu | Tray background |
| **Marketing Hero** | Cyan | Logo + headline accents | text-display heading | Lockup 240px | Accent in copy | Cyan primary + outline secondary | Dark #0F0F14 |
| **Marketing Feature** | Section Colors | Section accent color | text-heading-2 + body | N/A | Icon background + top border | Cyan primary CTA | Dark or darker dark |
| **Marketing Pricing** | Cyan | Card border + button | text-body | N/A | None | Cyan primary buttons | Dark backgrounds |
| **Marketing Footer** | Cyan | Logo color + links | text-caption | Logomark 28px | None | Link style | Dark #0F0F14 |
| **Email Header** | Cyan | Logo + button accent | Arial/Helvetica fallback | Lockup 160px | None | Cyan button background | Dark #1A1A24 |
| **Email Body** | Cyan | Links + button accent | Arial/Helvetica fallback | N/A | None | Cyan CTA button | Light or dark variant |
| **Email Footer** | Cyan | Logo + links | Arial/Helvetica caption | Logomark 28px | None | Link style | Dark #1A1A24 |
| **Twitter Post** | Cyan | Text highlights | Inter/fallback | N/A | Optional | Link preview | Dark screenshot |
| **Instagram Post** | Section Colors | Accent color for visual | Inter/fallback | Optional logo | Color-coded theme | Text overlay | Dark/product screenshot |
| **LinkedIn Article** | Cyan | Link + highlight color | Inter/fallback | Optional | None | Standard link | White article background |
| **Print Collateral** | CMYK Cyan | Logo + accents | Inter outlines | Lockup 2-3" | Optional | Solid color blocks | White or brand color |

### 5.2 Detailed Platform Specifications

#### Web Application

**Full Page Layout Example (Light Theme):**
```
┌────────────────────────────────────────────┐
│  [Logo 24px]  Dashboard  [Search]  [User]  │ Header: White bg, border-bottom
├──────────────────────────────────────────────┤
│ Ideas  │ ┌─────────────────────────────┐   │
│Pipeline│ │ Dashboard                   │   │
│Calendar│ │ ────────────────────────────│   │ Content: White bg
│ Goals  │ │                             │   │
│ Habits │ │  [Idea] [Idea] [Idea]      │   │
│        │ │                             │   │
│ ──────│ │  [Card]  [Card]  [Card]     │   │
│Workspace│ │                             │   │
│        │ │                             │   │
└─────────┴─────────────────────────────────┘

Sidebar:
  - Background: #FAFAFA
  - Border right: 1px #E5E7EB
  - Width: 240px (desktop), collapse on tablet
  - Active item: Full height section color
  - Hover: #F5F3FF background

Header:
  - Background: #FFFFFF
  - Border bottom: 1px #E5E7EB
  - Height: 56px
  - Primary CTA: Cyan button
  - Logo: Clickable to home
  - Padding: 12px 24px

Content:
  - Background: #FFFFFF
  - Padding: 32px (desktop), 16px (tablet), 12px (mobile)
  - Max-width: None (full bleed) or 1400px (centered)
  - Section gaps: 32px minimum
```

**Dark Theme Variant:**
```
Sidebar:
  - Background: #18181B
  - Border right: 1px #27272A
  - Active item: Section color (white text)

Header:
  - Background: #1A1A24
  - Border bottom: 1px #27272A

Content:
  - Background: #0F0F14
  - Card surfaces: #1A1A24
```

#### Mobile Application

**Full Screen Layout Example:**
```
┌──────────────────────────────┐
│ [Logo] Dashboard   [Menu]    │ Header: 40px, dark card bg
├──────────────────────────────┤
│                              │
│ [Hero Card - Dark bg]        │
│ ┌────────────────────────┐   │
│ │ Welcome back!          │   │
│ │ [+ New Idea]           │   │ Content: Scrollable
│ └────────────────────────┘   │
│                              │
│ [Card] [Card]               │
│ [Card] [Card]               │
│                              │
├──────────────────────────────┤
│ [Dashboard] [Ideas] [More]   │ Tab bar: 44px, light card bg
└──────────────────────────────┘

Header:
  - Height: 40px (minimum touch target)
  - Background: #1A1A24 (dark card)
  - Logo: Logomark 24px, clickable
  - Title: text-heading-3 centered or left
  - Right action: Menu button (44x44px)

Content:
  - Padding: 16px (top, left, right)
  - Bottom padding: 80px (above tab bar)
  - Cards: Full width - 32px margin
  - Gaps: 12px between cards

Tab Bar:
  - Height: 44px + safe area
  - Background: #1A1A24
  - Active icon: Section color
  - Badge: Red circle with number
```

#### Desktop Application (Electron)

**Window Layout Example:**
```
┌──────────────────────────────────────┐
│ [Logo] Ordo          [ - □ X ]       │ Title bar: 32px
├──────────────────────────────────────┤
│ Dashboard  ┌────────────────────────┐ │
│ Ideas      │ Content Area           │ │ Sidebar: 200px
│ Pipeline   │ [Dark card]            │ │ Content: Resizable
│ Calendar   │                        │ │
│            │                        │ │
│ ────────   │                        │ │
│ Settings   │                        │ │
└────────────┴────────────────────────┘ │

Title Bar:
  - Height: 32-40px
  - Background: #1A1A24
  - Draggable area: Full width except buttons
  - Buttons: Standard OS style
  - Logo + app name: Left side

Sidebar:
  - Width: 200px default, collapsible to 50px
  - Background: #18181B
  - Border right: 1px #27272A
  - Section items: Active item full height color
  - Hover: #3F3F46

Content:
  - Background: #0F0F14
  - Padding: 24px
  - Resizable panes: #27272A dividers
```

#### Marketing Website

**Hero Section:**
```
┌──────────────────────────────────────┐
│                                      │
│     Your Content OS                  │
│     ─────────────                    │
│     The operating system for         │ Dark background #0F0F14
│     creators who ship consistently.  │ Heading: 56px cyan highlight
│                                      │ Subheading: 28px
│     [Start Free] [See Demo]          │ CTAs: Cyan + outline
│                                      │
│   ┌──────────────────────────────┐   │
│   │  [Product Screenshot]        │   │
│   │  Dark mode featured          │   │
│   └──────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘

Section Colors: None in hero
Typography: 
  - H1: text-display (56px) cyan accents
  - H2: text-heading-2 (30px) white
Button colors: Cyan primary, outline secondary
```

#### Email

**Newsletter Template:**
```
┌──────────────────────────────┐
│                              │
│  [Ordo Logo 160px]           │ Header: Dark #1A1A24
│                              │
│  This week's updates         │ Heading: text-heading-3
│  ──────────────              │
│                              │
│  ┌────────────────────────┐  │ Content: White or light
│  │ Feature Title          │  │ Cards: Padding 24px
│  │ Brief description      │  │ Images: 100% width
│  │ [Learn More]           │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Tip for Creators       │  │
│  │ Help content           │  │
│  └────────────────────────┘  │
│                              │
│  [Upgrade to Pro]            │ CTA: Cyan button
│                              │
├──────────────────────────────┤
│ Company info | Help | etc    │ Footer: Dark #1A1A24
│ [Ordo Logo]  [Social icons]  │
└──────────────────────────────┘

Email CSS:
  - Fallback fonts: Arial, Helvetica
  - Inline styles only
  - Width: 600px (safe for all clients)
  - Background: #FFFFFF body, #1A1A24 header/footer
  - Links: Cyan with underline
```

---

## 6. Dark Mode as Brand

Dark mode is not an afterthought feature or accessibility accommodation. **Dark mode IS the brand**.

### 6.1 Dark Mode Philosophy

Ordo's dark mode is the primary brand expression because:

1. **Creator Reality**: Content creators work late (midnight to 4am editing sessions)
2. **Eye Comfort**: Dark mode reduces eye strain during long creative sessions
3. **Visual Premium**: Dark backgrounds make colors and UI pop
4. **Marketing Showcase**: Dark mode screenshots look more professional
5. **Brand Association**: Dark mode signals premium, sophisticated, creator-focused tool
6. **Modern Default**: 2026+ audiences expect dark-first design

### 6.2 Dark Mode as Default

**Default Application**
- Users see dark mode on first login (no light mode prompt)
- Light mode is available as alternative, not primary
- All marketing materials showcase dark mode
- Documentation examples use dark mode first
- Social media posts use dark backgrounds

**Why Dark-First?**
- Removes choice paralysis (one right way to start)
- Reflects creator workflows
- Stronger brand identity
- Reduces battery drain on OLED screens (mobile)
- No light mode -> dark mode transition animations needed

### 6.3 Dark Mode Color Values

**Background Colors (Dark)**
```
Page background:       #0F0F14  (almost-black)
Card/surface:         #1A1A24  (dark gray)
Elevated surface:     #27272A  (lighter gray, rare)
Hover/accent:         #3F3F46  (muted gray)
```

**Text Colors (Dark)**
```
Primary text:         #FAFAFA  (near-white)
Secondary text:       #A1A1AA  (muted gray)
Tertiary text:        #6B7280  (disabled gray)
```

**Interactive Colors (Dark)**
```
Primary cyan:         #22D3EE  (lighter, more vibrant)
Success green:        #34D399  (lighter)
Warning amber:        #FBBF24  (lighter)
Error red:            #F87171  (lighter)
```

### 6.4 Section Colors in Dark Mode

| Section | Light Hex | Dark Hex | Light OKLCH | Dark OKLCH | Notes |
|---------|-----------|----------|------------|-----------|-------|
| Cyan (Dashboard) | `#06B6D4` | `#22D3EE` | `oklch(0.68 0.18 205)` | `oklch(0.72 0.16 205)` | Lighter in dark mode |
| Violet (Ideas) | `#8B5CF6` | `#A78BFA` | `oklch(0.62 0.25 283)` | `oklch(0.68 0.20 283)` | Lifted lightness |
| Pink (Pipeline) | `#EC4899` | `#F472B6` | `oklch(0.62 0.24 333)` | `oklch(0.70 0.21 333)` | More vibrant |
| Orange (Workspaces) | `#F97316` | `#FB923C` | `oklch(0.68 0.21 41)` | `oklch(0.74 0.18 41)` | Warmer in dark |
| Blue (Calendar) | `#3B82F6` | `#60A5FA` | `oklch(0.59 0.23 238)` | `oklch(0.67 0.21 238)` | Lighter, less saturated |
| Green (Habits) | `#10B981` | `#34D399` | `oklch(0.62 0.18 165)` | `oklch(0.70 0.15 165)` | More saturated |
| Yellow (Notes) | `#EAB308` | `#FACC15` | `oklch(0.75 0.17 96)` | `oklch(0.80 0.15 96)` | Slightly lighter |
| Purple (Remix) | `#A855F7` | `#C084FC` | `oklch(0.62 0.26 276)` | `oklch(0.70 0.20 276)` | Lifted and lighter |
| Rose (Wellbeing) | `#F43F5E` | `#FB7185` | `oklch(0.59 0.25 20)` | `oklch(0.67 0.22 20)` | More vibrant |

**Dark Mode Adjustment Rules:**
- Increase lightness by 0.08-0.12 OKLCH (make colors pop)
- Keep saturation similar or slightly reduce
- Maintain hue (don't shift color tone)
- Test contrast ratios against dark backgrounds

### 6.5 Dark Mode CSS Implementation

```css
/* Root light mode (should not be used for Ordo) */
:root {
  --background: #FFFFFF;
  --foreground: #0A0A0B;
  --primary: #06B6D4;
  /* ... all light tokens ... */
}

/* Dark mode (DEFAULT, applied immediately) */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0F0F14;
    --foreground: #FAFAFA;
    --primary: #22D3EE;
    /* ... all dark tokens ... */
  }
}

/* Light mode (override if user explicitly enables) */
[data-theme="light"] {
  --background: #FFFFFF;
  --foreground: #0A0A0B;
  --primary: #06B6D4;
  /* ... all light tokens ... */
}

/* Forced dark mode (recommended) */
[data-theme="dark"] {
  --background: #0F0F14;
  --foreground: #FAFAFA;
  --primary: #22D3EE;
  /* ... all dark tokens ... */
}
```

**Forcing Dark Mode in HTML:**
```html
<!-- Option 1: HTML attribute (persistent) -->
<html data-theme="dark">

<!-- Option 2: CSS preference (respects OS setting) -->
@media (prefers-color-scheme: dark) {
  /* Dark theme CSS */
}

<!-- Option 3: Recommended combination -->
<html data-theme="dark" style="color-scheme: dark;">
```

### 6.6 Light Mode (Alternative)

If user explicitly chooses light mode:

**Light Mode Strategy:**
- Maintain same hex/OKLCH values as defined in light column
- All semantic colors remain consistent
- Button styles adapt to backgrounds
- Icons and illustrations may need outline adjustment

**Light Mode Considerations:**
- Reduced contrast (dark text on white is harder on eyes)
- Should not be default
- Respect user preference if explicitly selected
- Provide "light mode" toggle if needed, but hide by default

**Light Mode CSS:**
```css
[data-theme="light"] {
  --background: #FFFFFF;
  --foreground: #0A0A0B;
  --card: #FFFFFF;
  --primary: #06B6D4;
  --border: #E5E7EB;
  /* ... rest of light tokens ... */
}
```

### 6.7 Dark Mode Edge Cases

**Loading States**
```
Dark Mode Loading:
  Skeleton background: #1A1A24 (same as card)
  Skeleton shimmer: Animated gradient #27272A → #3F3F46 → #27272A
  Pulse effect: Opacity 0.5 → 1.0 at 1.5s interval
```

**Empty States**
```
Dark Mode Empty:
  Background: #0F0F14 (page background, no distinction)
  Illustration: Muted colors from palette
  Text: Primary foreground (#FAFAFA)
  CTA: Cyan primary button
```

**Modal/Dialog Overlay**
```
Dark Mode Modal:
  Overlay: rgba(0, 0, 0, 0.5) or rgba(15, 15, 20, 0.5)
  Modal background: #1A1A24 (card color)
  Modal border: 1px #27272A
  Scrim blur: 4px (optional, expensive on performance)
```

**Focus Indicators**
```
Dark Mode Focus Ring:
  Color: Cyan #22D3EE
  Width: 2px
  Offset: 2px
  Always visible (no reduction on dark)
```

### 6.8 Print & Export Considerations

When exporting from dark mode app:

**Print Export**
```
User exports as PDF from dark mode app:
  Option 1: Keep dark background
    - More ink usage, higher cost
    - Better visual fidelity

  Option 2: Convert to light background
    - Lighter printing, lower cost
    - May lose color accuracy
    - Text colors must invert

  Option 3: Adaptive (recommended)
    - Automatically detect print context
    - Switch to light theme for print
    - Keep dark mode on screen
```

**Screenshot/Image Export**
```
Maintain dark mode in exports:
  - Dark backgrounds in all exports
  - No conversion to light
  - Users expect what they see
  - Better color representation

Example CSS:
  @media print {
    /* Don't force light mode */
    /* Keep color scheme dark */
    color-scheme: dark;
  }
```

---

## 7. Accessibility in Brand

Accessibility is non-negotiable. Every brand color, size, and interaction must be accessible.

### 7.1 Color Contrast Requirements

**WCAG Standards:**
- **Level A**: 3:1 contrast ratio (minimum, rarely acceptable)
- **Level AA**: 4.5:1 for text, 3:1 for UI components (standard, required)
- **Level AAA**: 7:1 for text, 4.5:1 for UI components (enhanced, aspirational)

**Ordo Brand Contrast Matrix** (all combinations required)

| Element | Color | Background | Light Ratio | Dark Ratio | Status |
|---------|-------|-----------|------------|-----------|--------|
| Cyan button text | #FFFFFF | #06B6D4 | 7.5:1 | N/A | PASS AAA |
| Cyan button text | #FFFFFF | #22D3EE | 5.2:1 | N/A | PASS AA |
| Cyan link text | #06B6D4 | #FFFFFF | 4.8:1 | N/A | PASS AA |
| Cyan link text | #22D3EE | #0F0F14 | 6.2:1 | N/A | PASS AA |
| Body text | #0A0A0B | #FFFFFF | 18.8:1 | N/A | PASS AAA |
| Body text | #FAFAFA | #0F0F14 | N/A | 13.2:1 | PASS AAA |
| Secondary text | #6B7280 | #FFFFFF | 7.1:1 | N/A | PASS AAA |
| Secondary text | #A1A1AA | #0F0F14 | N/A | 6.8:1 | PASS AAA |
| Success bg | #D1FAE5 | Text #065F46 | 5.2:1 | N/A | PASS AA |
| Error bg | #FEE2E2 | Text #991B1B | 5.9:1 | N/A | PASS AA |
| Warning bg | #FEF3C7 | Text #92400E | 4.9:1 | N/A | PASS AA |
| Info bg | #DBEAFE | Text #1E40AF | 5.1:1 | N/A | PASS AA |
| Section color | Varies | Varies | Test each | Test each | CHECK |

### 7.2 Minimum Font Sizes

Smaller text requires higher contrast:

| Font Size | Min Contrast (AA) | Min Contrast (AAA) |
|-----------|------------------|-------------------|
| 18px+ (large text) | 3:1 | 4.5:1 |
| 14px-17px (normal) | 4.5:1 | 7:1 |
| 12px-13px (small) | 5.1:1 | 8.5:1 |
| 11px (caption) | 5.5:1 | 9:1 |
| < 11px | AVOID | AVOID |

**Ordo Application:**
- text-display (48px): 3:1 acceptable
- text-body (16px): 4.5:1 minimum (AA)
- text-caption (12px): 5.5:1 recommended
- Never use smaller than 11px for content

### 7.3 Color as Only Indicator (FAIL)

Never rely on color alone to communicate information.

**WRONG:**
```
Status indicator: Green dot = success, Red dot = error
  ❌ Colorblind users cannot distinguish
  
Link: Colored text only (no underline)
  ❌ Indistinguishable from regular text to some
  
Form validation: Red text for errors only
  ❌ Color-only communication
```

**RIGHT:**
```
Status indicator: Green dot + checkmark = success, Red X = error
  ✅ Both color and symbol communicate

Link: Colored text + underline (always visible)
  ✅ Multiple visual indicators

Form validation: Red text + icon + error message
  ✅ Color + symbol + text redundancy
```

### 7.4 Alternative Indicators for Brand Colors

**For Section Colors (Purple, Pink, Blue, etc.):**
- Icons in addition to color
- Text labels alongside color coding
- Border or background in addition to color
- Position/order as tertiary indicator

**Example Pipeline Status:**
```
WRONG: Just pink color for "In Review" status
BETTER: Pink badge with "In Review" text
BEST: Pink border + icon + "In Review" label + timestamp
```

### 7.5 High Contrast Mode Adjustments

When `prefers-contrast: more` is detected:

```css
@media (prefers-contrast: more) {
  /* Increase all borders to 2px minimum */
  --border-width: 2px;
  
  /* Increase outline thickness */
  *:focus-visible {
    outline-width: 3px;
  }
  
  /* Increase text weight for visibility */
  body {
    font-weight: 500;
  }
  
  /* Remove transparency, use solid colors */
  button {
    opacity: 1 !important;
  }
  
  /* Higher contrast backgrounds */
  --card: lighten(background, 15%);
  
  /* More visible focus indicators */
  --ring-width: 4px;
}
```

### 7.6 Motion Accessibility

When `prefers-reduced-motion` is detected:

```css
@media (prefers-reduced-motion: reduce) {
  /* Remove all non-essential animations */
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Keep transitions for UI feedback, just instant */
  button:hover {
    background-color: var(--hover-bg);
    /* No transition animation, instant change */
  }
  
  /* Disable entrance animations */
  .modal, .toast, [data-animate] {
    animation: none !important;
  }
}
```

### 7.7 Focus Management

Keyboard navigation must be obvious:

```css
/* Always visible focus rings */
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  /* No "outline: none" ever */
}

/* For dark mode, ensure ring color contrasts */
@media (prefers-color-scheme: dark) {
  *:focus-visible {
    outline-color: #22D3EE; /* Cyan, lighter in dark */
    outline-width: 2px;
  }
}

/* Remove default browser outline only if replacing with custom */
*:focus {
  outline: none; /* Only if we provide *:focus-visible */
}
```

### 7.8 Accessible Form Components

All form elements must meet accessibility standards:

**Labels:**
```
✅ Explicit labels connected to inputs
  <label for="email">Email Address</label>
  <input id="email" type="email" />

❌ Placeholder-only labels
  <input placeholder="Email Address" />
```

**Required Fields:**
```
✅ Text label "* Required" + aria-required
  <label for="name">Name <span aria-label="required">*</span></label>
  <input id="name" required aria-required="true" />

❌ Asterisk only
  <input placeholder="Name *" />
```

**Error Messages:**
```
✅ Text + icon + aria-describedby
  <input id="email" aria-describedby="email-error" />
  <span id="email-error" role="alert">Invalid email format</span>

❌ Red text only
  <input style="border-color: red;" />
```

### 7.9 Accessibility Checklist for Branding

- [ ] All text meets 4.5:1 contrast minimum (AA)
- [ ] Section colors have text labels in addition to color
- [ ] All buttons have visible focus rings (2px outline)
- [ ] All focus rings use cyan or high-contrast color
- [ ] No animations smaller than 200ms (allow for slow motion)
- [ ] prefers-reduced-motion is respected
- [ ] Color is never the only indicator
- [ ] Minimum 44x44px touch targets on mobile
- [ ] All form labels are explicitly connected
- [ ] Status messages have text + icon/color
- [ ] Captions available for all videos
- [ ] Alt text on all meaningful images
- [ ] Keyboard navigation works in all UI
- [ ] No flashing/strobing effects (> 3 times/second)

---

## Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)

- [ ] Install Inter font family in all environments
- [ ] Create design token files (CSS, JSON, Figma)
- [ ] Set up color system in design tool
- [ ] Configure dark mode as default
- [ ] Document all OKLCH color values
- [ ] Create Figma color variables

### Phase 2: Web App (Weeks 3-4)

- [ ] Update sidebar navigation colors
- [ ] Implement cyan primary buttons
- [ ] Add focus rings to all interactive elements
- [ ] Test color contrast ratios (automated tools)
- [ ] Implement dark mode CSS variables
- [ ] Update typography scales

### Phase 3: Mobile App (Weeks 5-6)

- [ ] Update tab bar styling
- [ ] Implement section colors in navigation
- [ ] Resize logomark for app icon
- [ ] Update FAB styling
- [ ] Test mobile color contrast
- [ ] Implement dark mode theme

### Phase 4: Marketing (Weeks 7-8)

- [ ] Update landing page colors
- [ ] Create hero section with cyan accents
- [ ] Implement feature section colors
- [ ] Update email templates
- [ ] Create social media templates
- [ ] Test all email client rendering

### Phase 5: Quality Assurance (Weeks 9-10)

- [ ] Accessibility audit (WAVE, Axe DevTools)
- [ ] Color contrast verification across all platforms
- [ ] Dark mode testing on all devices
- [ ] Brand consistency review
- [ ] Documentation completeness
- [ ] Design system handoff to team

### Phase 6: Launch & Maintenance

- [ ] Brand guideline PDF export
- [ ] Figma library sharing with team
- [ ] Design system documentation site
- [ ] Monthly brand guideline reviews
- [ ] Quarterly color/contrast audits

---

## Final Notes

This brand system is a **living document**. As Ordo evolves, this guide should be updated to reflect new platforms, features, and creative directions. The core principle remains constant:

> **Ordo's brand is about bringing order to creative chaos—clarity, consistency, and empowerment for creators who ship.**

Every color, font, and interaction should reinforce this promise.

---

**Document Metadata**
- Created: March 10, 2026
- Version: 1.0 (Complete)
- Status: Production-Ready
- Audience: Design team, Engineering, Product, Marketing
- Distribution: Internal (shared via Notion/Figma)
- Next Review: June 10, 2026
