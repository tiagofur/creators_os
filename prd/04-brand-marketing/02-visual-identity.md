# Visual Identity

> How Ordo Creator OS looks in the wild: logos, colors in context, and imagery guidelines.

---

## Logo

### Primary Logo

- **Logomark**: Stylized "O" with a forward-pointing element (representing progress/consistency)
- **Logotype**: "ordo" in lowercase Inter Bold
- **Lockup**: Logomark + logotype, horizontal arrangement

### Logo Usage

| Context | Format | Min Size |
|---------|--------|----------|
| App header | Logomark only | 24px |
| Login page | Full lockup | 120px wide |
| Marketing | Full lockup | 160px wide |
| Favicon | Logomark | 16px |
| Social avatar | Logomark on colored bg | 48px |

### Logo Clear Space

Minimum clear space around logo: Height of the "o" in "ordo" on all sides.

### Logo Don'ts

- Don't stretch or distort
- Don't rotate
- Don't add shadows or effects
- Don't place on busy backgrounds without contrast
- Don't change the colors outside approved variations
- Don't recreate or modify the logomark

### Logo Color Variations

| Variant | Usage |
|---------|-------|
| Cyan on white | Light backgrounds (primary) |
| White on dark | Dark backgrounds, dark mode |
| Cyan on dark | Dark mode accent |
| Monochrome (gray) | Minimal contexts, watermarks |

---

## Color in Context

### Primary Cyan -- When to Use

The cyan (`#06B6D4` light / `#22D3EE` dark) is our signature color. It should feel **special**, not overwhelming.

**Use for:**
- Primary CTA buttons
- Active navigation items
- Focus rings
- Links
- Progress indicators
- The Consistency Score accent
- Brand accents in marketing

**Don't use for:**
- Large background areas
- Body text
- Borders (use `--border` token)
- Every button on a page (only the primary action)

### Accent Colors -- In Context

| Color | Context | Example |
|-------|---------|---------|
| Cyan | Brand, primary actions | "Create Idea" button |
| Purple | AI features, studio | AI chat bubble, studio sidebar |
| Green | Success, streaks, habits | Streak counter, completed status |
| Red | Destructive, work timer | Delete button, Pomodoro timer |
| Orange | Warnings, workspaces | Workspace badge |
| Blue | Calendar, information | Calendar events, info toasts |
| Pink | Goals, projects | Goal progress bar |
| Yellow | Notes, achievements | Achievement badge |

### Background Strategy

| Surface | Light | Dark | Usage |
|---------|-------|------|-------|
| Page | `#FFFFFF` | `#0F0F14` | Main background |
| Card | `#FFFFFF` | `#1A1A24` | Elevated content |
| Sidebar | `#FAFAFA` | `#18181B` | Navigation |
| Hover | `#F5F3FF` | `#3F3F46` | Interactive feedback |
| Selected | `#ECFEFF` | `#27272A` | Active/selected state |

### Color Ratios on a Typical Page

```
Background (white/dark):      60%
Surface (cards, sidebar):     25%
Primary accent (cyan):         5%
Secondary accents:              5%
Text colors:                    5%
```

The **60-25-10-5** rule: Backgrounds dominate, surfaces organize, accents highlight, colors inform.

---

## Photography & Imagery

### Style

- **Authentic**: Real creators in real environments
- **Warm**: Natural lighting, warm color temperature
- **Active**: Creators working, filming, editing (not posed)
- **Diverse**: Multiple ethnicities, genders, ages, content types
- **Tech-positive**: Devices visible but not the focus

### Do

- Show creators at their desk/studio
- Show real content creation tools (camera, microphone, laptop)
- Show the product in context (laptop with Ordo on screen)
- Use natural expressions (not stock photo smiles)

### Don't

- Use generic stock photos
- Show only one demographic
- Feature competitors' products
- Use heavy filters or unrealistic editing
- Show creators looking frustrated (show the solution, not the problem)

### Screenshot Guidelines

| Element | Rule |
|---------|------|
| Theme | Dark mode as primary showcase |
| Data | Realistic sample data (not "Lorem ipsum") |
| Browser | Minimal chrome, or none |
| Annotations | Use cyan arrows/circles for callouts |
| Dimensions | 16:10 for desktop, 9:16 for mobile |
| Quality | Retina (2x) minimum |

---

## Social Media Presence

### Profile Assets

| Platform | Avatar | Banner Size | Banner Style |
|----------|--------|-------------|-------------|
| Twitter/X | Logomark on dark bg | 1500x500 | Product screenshot + tagline |
| LinkedIn | Logomark on dark bg | 1584x396 | Product screenshot + tagline |
| YouTube | Logomark on dark bg | 2560x1440 | Product showcase |
| Instagram | Logomark on dark bg | N/A | N/A |

### Post Templates

**Feature Announcement:**
```
Header: Product screenshot (dark mode)
Text: One-line feature description
CTA: "Try it now" or "Coming soon"
Colors: Dark background, cyan accent
```

**Tip/Educational:**
```
Header: Stylized text on dark background
Body: 3-5 bullet points
Footer: Ordo logo + tagline
Colors: Dark background, content varies
```

**Milestone/Achievement:**
```
Header: Number/stat prominently displayed
Subtext: Context and celebration
Colors: Dark background, gold/yellow accent
```

---

## Marketing Page Design

### Hero Section

```
┌────────────────────────────────────────────────┐
│                                                │
│     Your Content OS                            │
│     ─────────────                              │
│     The operating system for content           │
│     creators who ship consistently.            │
│                                                │
│     [Start Free]  [See How It Works]           │
│                                                │
│     ┌──────────────────────────────────┐       │
│     │  [Product Screenshot - Dark]     │       │
│     │                                  │       │
│     └──────────────────────────────────┘       │
│                                                │
└────────────────────────────────────────────────┘

Background: Dark (#0F0F14)
Headline: White, text-display
CTA Primary: Cyan button
CTA Secondary: Ghost/outline button
```

### Feature Sections

```
Each feature section alternates:
- Left text + right screenshot
- Right text + left screenshot

With section-specific accent colors.
```

### Social Proof

- Creator testimonials with real photos
- Usage stats (ideas captured, content published)
- Platform logos of integrations

---

## Motion & Animation in Brand

### Brand Animations

| Animation | Usage | Duration |
|-----------|-------|----------|
| Logo entrance | Page load, splash screen | 0.5s |
| Feature reveal | Scroll-triggered | 0.3s |
| Stat counter | Number counting up | 1s |
| Screenshot transition | Feature demo | 0.4s |

### Micro-interactions (In-Product)

| Interaction | Animation | Feel |
|------------|-----------|------|
| Button press | Scale down 0.98 | Tactile |
| Card hover | Lift shadow | Floating |
| Achievement unlock | Confetti + sparkle | Celebration |
| Streak update | Fire pulse | Motivating |
| XP gain | Number fly-up | Rewarding |
| Status change | Smooth slide | Progress |

---

## Dark Mode as Brand

**Dark mode is our primary showcase.** It's not an afterthought -- it's the default brand expression.

### Why

1. Creators work at night (editing, scripting)
2. Dark mode is easier on eyes for long sessions
3. It looks more premium and professional
4. Colors pop more on dark backgrounds
5. Screenshots look better in marketing

### How

- All marketing materials feature dark mode screenshots
- Documentation uses dark mode examples first
- Social media posts use dark backgrounds
- The landing page defaults to dark

---

*Visual identity is the first promise. Make it count.*
