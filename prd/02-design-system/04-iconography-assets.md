# Iconography & Assets

> Guidelines for icons, illustrations, and visual assets in Ordo Creator OS.

---

## Icon System

### Icon Library

**Primary**: Lucide Icons (React)
- Consistent 24px grid
- 1.5px stroke width
- Rounded line caps and joins

### Icon Sizes

| Size | Pixels | Usage |
|------|--------|-------|
| `xs` | 12px | Inline with small text |
| `sm` | 16px | Badges, tags, small buttons |
| `md` | 20px | Default, most contexts |
| `lg` | 24px | Navigation, section headers |
| `xl` | 32px | Empty states, featured areas |
| `2xl` | 48px | Onboarding, hero sections |

### Icon Colors

| Context | Color Token | Example |
|---------|------------|---------|
| Default | `text-foreground` | Navigation items |
| Muted | `text-muted-foreground` | Secondary actions |
| Primary | `text-primary` | Active/selected items |
| Destructive | `text-destructive` | Delete actions |
| Success | `text-green-500` | Completed states |
| Warning | `text-yellow-500` | Warning indicators |

### Section Icons

| Section | Icon | Color |
|---------|------|-------|
| Dashboard | `LayoutDashboard` | Cyan |
| Ideas | `Lightbulb` | Violet |
| Pipeline | `Kanban` | Pink |
| Series | `Library` | Blue |
| Publishing | `Send` | Cyan |
| Calendar | `Calendar` | Blue |
| Analytics | `BarChart3` | Cyan |
| Consistency | `Flame` | Green |
| Gamification | `Trophy` | Yellow |
| Goals | `Target` | Pink |
| Inbox | `MessageSquare` | Blue |
| Sponsorships | `Handshake` | Orange |
| AI Chat | `Bot` | Purple |
| Settings | `Settings` | Gray |

### Content Type Icons

| Type | Icon | Color |
|------|------|-------|
| Video | `Video` | Red |
| Short/Reel | `Smartphone` | Pink |
| Tweet/Thread | `Twitter` | Blue |
| Post | `FileText` | Gray |
| Newsletter | `Mail` | Green |
| Podcast | `Mic` | Purple |
| Blog | `BookOpen` | Orange |

### Platform Icons

| Platform | Usage |
|----------|-------|
| YouTube | Publishing, analytics |
| TikTok | Publishing, analytics |
| Instagram | Publishing, analytics |
| Twitter/X | Publishing, analytics |
| LinkedIn | Publishing, analytics |
| Facebook | Publishing, analytics |

---

## Illustration Style

### Empty States

- **Style**: Minimal line illustrations with a single accent color
- **Colors**: Use `text-muted-foreground` for lines, `text-primary` for accent
- **Size**: 120px - 200px wide
- **Mood**: Encouraging, not sad

### Onboarding

- **Style**: Slightly more detailed, still line-based
- **Colors**: Primary + one accent color
- **Animation**: Subtle entry animation (`fadeInUp`)

### Achievement Celebrations

- **Style**: Icon-centric with particle effects
- **Animation**: `confetti` + `sparkle` animations
- **Duration**: 2-3 seconds max

---

## Avatar System

### User Avatars

| Size | Pixels | Border Radius | Usage |
|------|--------|--------------|-------|
| `xs` | 24px | full | Inline mentions |
| `sm` | 32px | full | Comment threads |
| `md` | 40px | full | Navigation, cards |
| `lg` | 48px | full | Profile headers |
| `xl` | 64px | full | Profile pages |
| `2xl` | 96px | full | Settings, onboarding |

**Fallback**: Initials on colored background
- Background: Generated from user name hash using tag color palette
- Text: White, bold, centered
- Example: "SA" for "Sarah Adams" on `#8B5CF6` background

### Workspace Avatars

- Square with `rounded-lg` (not circular)
- Custom upload or auto-generated from workspace name
- Border in workspace color

---

## Favicon & App Icons

### Web Favicon
- 16x16, 32x32, 180x180 (apple-touch-icon)
- Simple "O" logomark on solid background

### Mobile App Icon
- iOS: 1024x1024, no transparency, rounded by OS
- Android: Adaptive icon (foreground + background layers)
- Color: Primary cyan background, white logomark

### Desktop App Icon
- macOS: 1024x1024, with shadow
- Windows: ICO format, multiple sizes
- Linux: 256x256 PNG

---

## Asset Guidelines

### Photography (Marketing)
- **Style**: Candid, authentic creator shots
- **Subjects**: Real creators at work (filming, editing, writing)
- **Treatment**: No filters, no heavy editing
- **Diversity**: Inclusive representation

### Screenshots
- **Browser chrome**: Minimal or removed
- **Dark mode**: Always show dark mode as primary
- **Annotations**: Use primary color for callouts
- **Cursor**: Show cursor interaction when relevant

### Video/GIF
- **Format**: MP4 (video), WebM (web), GIF (social)
- **Framerate**: 30fps for demos, 60fps for animations
- **Max duration**: 15s for demos, 5s for micro-interactions

---

## File Naming Convention

```
icon-{name}-{size}.svg
illustration-{context}-{theme}.svg
screenshot-{feature}-{platform}-{theme}.png
avatar-{type}-{size}.png
```

Examples:
```
icon-lightbulb-24.svg
illustration-empty-ideas-dark.svg
screenshot-pipeline-web-dark.png
avatar-fallback-md.png
```

---

*Icons and assets are the personality of the interface. Keep them consistent and purposeful.*
