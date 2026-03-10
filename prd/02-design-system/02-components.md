# Component Library

> Every reusable component in the Ordo Creator OS design system.

---

## Component Architecture

```
packages/ui/         # Web + Desktop shared components
packages/ui-mobile/  # Mobile-specific components
packages/ui-shared/  # Cross-platform abstractions (CVA configs, types)
```

### Component Rules

1. **Platform-agnostic**: No `useRouter`, `useSearchParams`, or platform-specific APIs
2. **Data via props**: Accept all data and callbacks through props
3. **i18n via props**: Accept translated strings as optional `labels` prop
4. **CVA for variants**: Use `class-variance-authority` for all variant logic
5. **Forwarded refs**: All interactive components use `React.forwardRef`
6. **TypeScript strict**: Full type definitions for all props

---

## Base Components

### Button

The primary interactive element. Uses CVA for variant management.

**Variants:**

| Variant | Light | Dark | Usage |
|---------|-------|------|-------|
| `default` / `primary` | Cyan bg, white text | Bright cyan bg, dark text | Primary CTAs |
| `secondary` | Light gray bg, dark text | Dark gray bg, light text | Secondary actions |
| `destructive` / `danger` | Red bg, white text | Dark red bg, white text | Delete, dangerous actions |
| `outline` | White bg, border, dark text | Transparent bg, border, light text | Tertiary actions |
| `ghost` | Transparent, hover gray | Transparent, hover dark gray | Inline actions |
| `link` | Cyan text, underline on hover | Light cyan text | Inline links |
| `success` | Green bg, white text | Green bg, white text | Confirm positive actions |

**Sizes:**

| Size | Height | Padding | Font | Usage |
|------|--------|---------|------|-------|
| `xs` | 28px (h-7) | px-2 | text-xs | Compact UI (tags, badges) |
| `sm` | 32px (h-8) | px-3 | text-xs | Secondary buttons, toolbars |
| `default` | 36px (h-9) | px-4 | text-sm | Standard buttons |
| `md` | 40px (h-10) | px-4 | text-sm | Emphasized buttons |
| `lg` | 44px (h-11) | px-8 | text-sm | Hero CTAs |
| `icon` | 36px (9x9) | centered | - | Icon-only buttons |
| `icon-lg` | 40px (10x10) | centered | - | Large icon buttons |

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'destructive' | 'danger' | 'outline' |
            'secondary' | 'ghost' | 'link' | 'success';
  size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'icon' | 'icon-lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}
```

**States:**
- Default, Hover (`bg-primary/90`), Active (scale 0.99), Disabled (`opacity-50 pointer-events-none`), Loading (spinner icon)

---

### Input

Text input field with validation support.

**Sizes:**

| Size | Height | Usage |
|------|--------|-------|
| `sm` | 32px (h-8) | Compact forms |
| `md` | 40px (h-10) | Standard forms (default) |
| `lg` | 48px (h-12) | Prominent inputs |

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
}
```

**States:**
- Default: `border-input bg-background`
- Focus: `ring-2 ring-ring`
- Error: `border-destructive ring-destructive`
- Disabled: `opacity-50 cursor-not-allowed`

---

### Card

Container component for grouping related content.

**Variants:**

| Variant | Style | Usage |
|---------|-------|-------|
| `default` | `border bg-card` | Standard cards |
| `outlined` | `border-2 bg-transparent` | Emphasized cards |
| `elevated` | `shadow-lg shadow-black/5` | Floating cards |
| `glass` | `bg-background/60 backdrop-blur-lg` | Overlay cards |

**Padding:**

| Size | Value | Usage |
|------|-------|-------|
| `none` | 0 | Custom padding |
| `sm` | 12px (p-3) | Compact cards |
| `md` | 24px (p-6) | Standard cards (default) |
| `lg` | 32px (p-8) | Featured cards |

**Props:**
```typescript
interface CardProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;   // Adds hover + active states
  selected?: boolean;    // Adds primary border + ring
  className?: string;
  children: React.ReactNode;
}
```

---

### Badge

Small label for status, category, or count.

**Variants:**

| Variant | Style | Usage |
|---------|-------|-------|
| `default` | Primary bg | Default tags |
| `secondary` | Secondary bg | Muted tags |
| `outline` | Border only | Subtle tags |
| `destructive` | Red bg | Error/danger tags |
| `success` | Green bg | Success tags |
| `warning` | Yellow bg | Warning tags |

**Sizes:**

| Size | Padding | Font | Usage |
|------|---------|------|-------|
| `sm` | px-2.5 py-0.5 | text-xs | Default |
| `md` | px-3 py-1 | text-sm | Medium emphasis |
| `lg` | px-4 py-1.5 | text-base | High emphasis |

**Shape:**
- `pill: true` = `rounded-full` (default)
- `pill: false` = `rounded-md`

---

### Modal / Dialog

Overlay content that requires user attention.

**Structure:**
```
Modal
├── Overlay (semi-transparent backdrop)
├── Content
│   ├── Header (title + close button)
│   ├── Body (scrollable content)
│   └── Footer (action buttons)
```

**Sizes:** `sm` (420px), `md` (560px), `lg` (720px), `xl` (960px), `full` (100%)

---

### Sidebar

Persistent navigation component.

**Colors (Light):**
- Background: `#FAFAFA`
- Foreground: `#1F2937`
- Primary: `#06B6D4` (Cyan)
- Accent: `#ECFEFF`
- Border: `#E5E7EB`

**Colors (Dark):**
- Background: `#18181B`
- Foreground: `#FAFAFA`
- Primary: `#A78BFA` (Purple -- differs from main primary!)
- Accent: `#27272A`
- Border: `#27272A`

**States:** Expanded (w-64), Collapsed (w-16)

---

## Data Display Components

### Table
- Responsive with horizontal scroll on mobile
- Sortable columns
- Row hover state: `bg-muted/50`
- Striped option available

### Stat Card
- Icon + value + label + trend indicator
- Section-themed (uses section color for icon/accent)

### Progress Bar
- Animated fill (`animate-progress-fill`)
- Color variants: primary, success, warning, danger
- Optional percentage label

### Avatar
- Sizes: `xs` (24px), `sm` (32px), `md` (40px), `lg` (48px), `xl` (64px)
- Fallback: Initials on colored background
- Status indicator dot (online/offline)

### Tooltip
- Appears on hover (desktop) or long-press (mobile)
- Arrow pointer
- Max width: 240px
- Dark background, light text

---

## Form Components

### Select / Dropdown
- Same size variants as Input (sm, md, lg)
- Searchable option
- Multi-select variant
- Group headers

### Checkbox
- Custom styled (primary color when checked)
- Indeterminate state for bulk selection

### Radio Group
- Custom styled circles
- Horizontal or vertical layout

### Switch / Toggle
- Animated thumb transition
- Success color when enabled

### Textarea
- Auto-resize option
- Character count
- Same border/focus styles as Input

### Date Picker
- Calendar popover
- Range selection support
- Locale-aware formatting

---

## Feedback Components

### Toast / Notification
- Variants: success (green), error (red), warning (yellow), info (blue)
- Auto-dismiss (5s default)
- Slide-in from top-right (desktop) or top-center (mobile)
- Action button option

### Skeleton Loader
- Shimmer animation (`animate-shimmer`)
- Matches component shapes (text, avatar, card, table row)

### Empty State
- Centered illustration + message + CTA
- Custom icon per context

### Error State
- Red accent
- Error message + retry button
- Optional stack trace (dev mode)

---

## Navigation Components

### Tabs
- Horizontal tabs with underline indicator
- Section-themed active color
- Responsive: scrollable on mobile

### Breadcrumb
- Chevron separator
- Truncated middle items for long paths

### Pagination
- Previous/Next buttons
- Page number buttons
- Items per page selector

---

## Layout Components

### Page Header
```
[Back] [Icon] Title                    [Actions]
              Subtitle/Description
```

### Section Header
```
Section Title                           [Action]
─────────────────────────────────────────────
```

### Divider
- Horizontal: 1px `border-border`
- With label: text centered on divider

### Container
- Max widths: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px)
- Centered with auto margins
- Responsive padding

---

## Specialized Creator Components

### Pipeline Card (Kanban)
- Content type icon (Video, Tweet, etc.)
- Title + status badge
- Series tag
- Timer indicator
- Assignee avatar
- Priority indicator
- Drag handle

### Idea Card
- Title + AI validation score
- Tags (color-coded)
- Quick actions: Validate, Promote, Archive
- Swipe actions on mobile

### Series Card
- Thumbnail image
- Title + episode count
- Publishing schedule indicator
- Status badge (Active, Archived, Draft)

### Calendar Slot
- Platform icon
- Content title (truncated)
- Time label
- Status indicator (scheduled, published, draft)

### Consistency Heatmap
- GitHub-style grid
- 7 columns (days) x N rows (weeks)
- Color intensity based on activity
- Tooltip with date and count

### XP Progress Bar
- Current level badge
- XP progress to next level
- Animated fill with glow effect

### Streak Counter
- Fire icon with streak number
- Multiplier badge
- Grace period indicator

---

## Component Composition Pattern

```typescript
// Page-level composition example
<PageHeader
  title="Content Pipeline"
  icon={<PipelineIcon />}
  actions={<Button>New Content</Button>}
/>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {statCards.map(stat => (
    <StatCard key={stat.label} {...stat} />
  ))}
</div>

<Card>
  <CardHeader>
    <SectionHeader title="Pipeline" action={<FilterButton />} />
  </CardHeader>
  <CardContent>
    <KanbanBoard columns={columns} cards={cards} />
  </CardContent>
</Card>
```

---

## Component Checklist

Before shipping any component:

- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] Responsive at 320px, 768px, 1024px+
- [ ] Keyboard navigable (Tab, Enter, Escape)
- [ ] Has ARIA labels where needed
- [ ] No transparency in backgrounds
- [ ] No gradients
- [ ] Uses design tokens (not raw hex values)
- [ ] Has TypeScript types for all props
- [ ] Platform-agnostic (no router, no fetch, no window)
- [ ] Exported from barrel file

---

*Components are the atoms of the UI. Get them right and everything composes beautifully.*
