# Responsive Design

> Strategy and implementation for responsive layouts across all screen sizes.

---

## Breakpoint Strategy

### Mobile-First Approach

All styles start at mobile and scale up. Use Tailwind responsive prefixes:

```css
/* Mobile (default): 0px+ */
class="p-4 text-sm grid-cols-1"

/* Tablet: 768px+ */
class="md:p-6 md:text-base md:grid-cols-2"

/* Desktop: 1024px+ */
class="lg:p-8 lg:text-lg lg:grid-cols-3"

/* Large Desktop: 1280px+ */
class="xl:grid-cols-4"
```

### Breakpoint Reference

| Name | Min Width | Typical Devices |
|------|-----------|----------------|
| Default | 0px | iPhone SE, small phones |
| `sm` | 640px | Large phones (landscape) |
| `md` | 768px | iPad, tablets |
| `lg` | 1024px | iPad Pro, small laptops |
| `xl` | 1280px | Laptops, desktops |
| `2xl` | 1536px | Large desktops, ultrawides |

### Design Targets (Must Test)

| Width | Device | Priority |
|-------|--------|----------|
| **320px** | iPhone SE | P0 - Must work |
| **375px** | iPhone 14 | P0 - Must work |
| **390px** | iPhone 15 | P0 - Primary mobile |
| **768px** | iPad | P0 - Primary tablet |
| **1024px** | iPad Pro / Small laptop | P0 - Transition point |
| **1280px** | Standard laptop | P0 - Primary desktop |
| **1440px** | Large monitor | P1 - Should work |
| **1920px** | Full HD | P1 - Should work |
| **2560px** | Ultrawide | P2 - Nice to have |

---

## Layout Strategies

### Page Layouts

#### Mobile (< 768px)
```
┌────────────────────────┐
│  Header (sticky, 56px) │
│────────────────────────│
│                        │
│  Content               │
│  (full width)          │
│  (p-4)                 │
│                        │
│────────────────────────│
│  Tab Bar (56px)        │
└────────────────────────┘

- Sidebar: Hidden (hamburger menu)
- Content: Full width with 16px padding
- Actions: FAB or bottom sheet
```

#### Tablet (768px - 1024px)
```
┌────┬───────────────────┐
│ IC │  Header            │
│ ON │───────────────────│
│ S  │                    │
│    │  Content           │
│    │  (fluid width)     │
│    │  (p-6)             │
│    │                    │
└────┴───────────────────┘

- Sidebar: Collapsed (w-16, icons only)
- Content: Fills remaining space
- Modals: Centered, 80% width
```

#### Desktop (1024px+)
```
┌──────────┬──────────────────────────────┐
│          │  Header / Breadcrumb         │
│  SIDEBAR │──────────────────────────────│
│  (w-64)  │                              │
│          │  Content                     │
│          │  (max-w-7xl, centered)       │
│          │  (p-8)                       │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘

- Sidebar: Expanded (w-64, full labels)
- Content: Max-width with auto margins
- Side panels: Slide in from right
```

### Grid Patterns

```html
<!-- Stat Cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

<!-- Content Cards -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

<!-- Two-Column Layout -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div class="lg:col-span-2">Main content</div>
  <div>Sidebar</div>
</div>
```

---

## Component Responsive Behavior

### Navigation

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Sidebar | Overlay (hamburger) | Collapsed (icons) | Expanded (labels) |
| Tab Bar | Bottom (fixed) | Hidden | Hidden |
| Breadcrumbs | Hidden | Truncated | Full path |
| Search | Full screen overlay | Header inline | Header inline |

### Data Display

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Table | Card/list view | Reduced columns | Full table |
| Kanban | Swipe columns | 2 visible + scroll | All visible |
| Calendar | Day view | Week view | Month view |
| Charts | Simplified | Standard | Full with legend |
| Stats | 2-column grid | 2-column | 4-column |

### Forms

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Input layout | Stacked (full width) | 2-column where logical | 2-column, max-w-lg |
| Select | Native picker | Custom dropdown | Custom dropdown |
| Date picker | Native date input | Calendar popover | Calendar popover |
| Modals | Full screen sheet | Centered (80% width) | Centered (max-w-lg) |
| Actions | Bottom sticky bar | Inline | Inline |

### Content

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Page title | text-xl | text-2xl | text-3xl |
| Body text | text-sm | text-base | text-base |
| Card padding | p-3 | p-4 | p-6 |
| Section gap | gap-4 | gap-6 | gap-8 |
| Page padding | p-4 | p-6 | p-8 |

---

## Responsive Utilities

### Show/Hide

```html
<!-- Mobile only -->
<div class="block md:hidden">Mobile content</div>

<!-- Tablet and up -->
<div class="hidden md:block">Tablet+ content</div>

<!-- Desktop only -->
<div class="hidden lg:block">Desktop content</div>
```

### Responsive Text

```html
<h1 class="text-xl md:text-2xl lg:text-3xl font-bold">
  Page Title
</h1>

<p class="text-sm md:text-base text-muted-foreground">
  Description text that scales with screen size
</p>
```

### Responsive Spacing

```html
<!-- Page wrapper -->
<div class="p-4 md:p-6 lg:p-8">

<!-- Section spacing -->
<div class="space-y-4 md:space-y-6 lg:space-y-8">

<!-- Card grid -->
<div class="gap-3 md:gap-4 lg:gap-6">
```

---

## Touch vs Pointer

### Touch Targets

| Element | Minimum Size | Recommended |
|---------|-------------|-------------|
| Buttons | 44px x 44px | 48px x 48px |
| Links (inline) | 44px height | - |
| Icons (interactive) | 44px x 44px | - |
| List items | 48px height | 56px height |
| Checkboxes | 44px x 44px | - |

### Swipe Gestures (Mobile)

| Gesture | Action | Where |
|---------|--------|-------|
| Swipe left | Delete/archive | Idea cards, inbox items |
| Swipe right | Promote/complete | Idea cards, tasks |
| Pull down | Refresh | All list views |
| Swipe horizontal | Switch Kanban columns | Pipeline |

### Hover States (Desktop Only)

```html
<!-- Show on hover (desktop), always visible (mobile) -->
<div class="opacity-0 md:group-hover:opacity-100
            md:opacity-0
            transition-opacity">
  Action buttons
</div>

<!-- Alternative: always visible on mobile -->
<div class="block md:hidden">Always visible actions</div>
<div class="hidden md:block opacity-0 group-hover:opacity-100">
  Hover-revealed actions
</div>
```

---

## Testing Checklist

### Must Test At:

- [ ] **320px** - iPhone SE (smallest supported)
- [ ] **375px** - iPhone standard
- [ ] **768px** - iPad portrait
- [ ] **1024px** - iPad landscape / small laptop
- [ ] **1280px** - Standard laptop
- [ ] **1920px** - Full HD monitor

### Must Verify:

- [ ] No horizontal scrollbar on any breakpoint
- [ ] All text readable (no truncation hiding critical info)
- [ ] All interactive elements reachable (no overflow hiding buttons)
- [ ] Navigation accessible at every size
- [ ] Modals/popovers fit within viewport
- [ ] Tables have horizontal scroll or card fallback
- [ ] Images scale without distortion
- [ ] Forms are usable with thumb reach on mobile

---

*Design for the smallest screen first, then expand. If it works at 320px, it works everywhere.*
