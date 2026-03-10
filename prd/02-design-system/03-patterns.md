# UI Patterns & Interactions

> Recurring patterns, layouts, and interaction models across Ordo Creator OS.

---

## Layout Patterns

### 1. Sidebar + Content (Desktop Default)

```
┌──────┬────────────────────────────────────────┐
│      │  Header / Breadcrumb                   │
│  S   │────────────────────────────────────────│
│  I   │                                        │
│  D   │  Page Content                          │
│  E   │                                        │
│  B   │                                        │
│  A   │                                        │
│  R   │                                        │
│      │                                        │
└──────┴────────────────────────────────────────┘

Sidebar: w-64 (expanded) | w-16 (collapsed)
Content: flex-1, max-w-7xl centered
```

### 2. Full-Width Content (Mobile)

```
┌────────────────────────┐
│  Header (sticky)       │
│────────────────────────│
│                        │
│  Scrollable Content    │
│                        │
│                        │
│                        │
│────────────────────────│
│  Tab Bar (sticky)      │
└────────────────────────┘
```

### 3. Split View (Studio/Editor)

```
┌──────┬──────────────────────┬──────────┐
│      │                      │          │
│  A   │  Canvas / Editor     │  AI      │
│  S   │  (center)            │  Copilot │
│  S   │                      │  (right) │
│  E   │                      │          │
│  T   │                      │          │
│  S   │                      │          │
│      │                      │          │
└──────┴──────────────────────┴──────────┘

Left: w-64 (assets panel)
Center: flex-1 (editor)
Right: w-80 (AI sidebar)
```

### 4. Dashboard Grid

```
┌──────────────────────────────────────────┐
│  Welcome Banner / Quick Stats            │
│──────────────────────────────────────────│
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Stat 1│ │Stat 2│ │Stat 3│ │Stat 4│   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│──────────────────────────────────────────│
│  ┌───────────────────┐ ┌──────────────┐ │
│  │  Pipeline Overview │ │  Activity    │ │
│  │  (2/3 width)      │ │  Feed        │ │
│  │                    │ │  (1/3 width) │ │
│  └───────────────────┘ └──────────────┘ │
└──────────────────────────────────────────┘

grid-cols-1 md:grid-cols-2 lg:grid-cols-4
```

### 5. Kanban Board

```
┌──────────────────────────────────────────────┐
│  [Scripting]  [Filming]  [Editing]  [Review] │
│  ┌────────┐  ┌────────┐  ┌────────┐         │
│  │ Card 1 │  │ Card 3 │  │ Card 5 │         │
│  └────────┘  └────────┘  └────────┘         │
│  ┌────────┐  ┌────────┐                     │
│  │ Card 2 │  │ Card 4 │                     │
│  └────────┘  └────────┘                     │
└──────────────────────────────────────────────┘

Columns: min-w-[280px], flex-shrink-0
Horizontal scroll on overflow
Cards: draggable between columns
```

---

## Interaction Patterns

### 1. Quick Capture

**Trigger**: `Cmd+K` (desktop), FAB button (mobile), Telegram message
**Flow**:
```
1. Keyboard shortcut triggers floating input
2. User types idea title
3. AI auto-tags and validates in background
4. Press Enter to save
5. Toast confirms: "Idea captured"
6. Input stays open for more ideas (optional)
```

### 2. Drag and Drop

**Used in**: Pipeline Kanban, Calendar, Series episodes
**Behavior**:
```
1. Long press (200ms) activates drag
2. Item lifts with shadow (animate-lift)
3. Drop zones highlight on hover
4. Release drops item, triggers API update
5. Optimistic UI update (revert on error)
```

### 3. Status Flow Transitions

**Pattern**: Sequential status with confirmation
```
Content Card > Click status badge > Shows next status option
> Confirm transition > Optimistic update > Toast confirmation
```

**Pipeline flow**: `SCRIPTING > FILMING > EDITING > REVIEW > SCHEDULED > PUBLISHED`
**Idea flow**: `ACTIVE > VALIDATED > PROMOTED > GRAVEYARDED`

### 4. Bulk Actions

**Pattern**: Select > Action bar appears
```
1. Checkbox on each item (or Cmd+Click)
2. Floating action bar slides up from bottom
3. Actions: Delete, Move, Tag, Schedule
4. Confirmation modal for destructive actions
5. Progress indicator for batch operations
```

### 5. Infinite Scroll + Pagination

**Pattern**: Load more on scroll, with page indicators
```
1. Initial load: 20 items
2. Scroll to bottom > Loading skeleton appears
3. Next page loads and appends
4. "Back to top" button appears after 2 pages
5. Total count displayed in header
```

### 6. Filter and Search

**Pattern**: Persistent filters with URL state
```
┌────────────────────────────────────────┐
│ [Search: ___________] [Status ▾] [Type ▾] [Clear All] │
│────────────────────────────────────────│
│ Showing 24 of 156 results             │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │    │ │    │ │    │ │    │          │
│ └────┘ └────┘ └────┘ └────┘          │
└────────────────────────────────────────┘
```

### 7. Confirmation Modal

**For destructive actions:**
```
┌────────────────────────────────────┐
│  ⚠ Delete Content                  │
│                                    │
│  Are you sure you want to delete   │
│  "CSS Grid Tutorial"?              │
│  This action cannot be undone.     │
│                                    │
│        [Cancel]  [Delete]          │
└────────────────────────────────────┘

Cancel: ghost button (left)
Confirm: destructive button (right)
```

### 8. Toast Notifications

**Positions:**
- Desktop: Top-right corner
- Mobile: Top-center

**Types:**
| Type | Icon | Color | Duration |
|------|------|-------|----------|
| Success | Checkmark | Green | 3s |
| Error | X circle | Red | 5s (persistent) |
| Warning | Triangle | Yellow | 4s |
| Info | Info circle | Blue | 3s |

### 9. Loading States

**Skeleton Loaders**: Match the shape of the content they replace
```
Text line:     ██████████████████░░░░░░
Avatar:        ⬤░░░
Card:          ┌─────────────────────┐
               │ ░░░░░░░░░░░░░░░░░░ │
               │ ░░░░░░░░░░░░       │
               └─────────────────────┘
```

**Shimmer animation**: Left-to-right sweep, 2s cycle

### 10. Empty States

```
┌────────────────────────────────────┐
│                                    │
│         [Illustration]             │
│                                    │
│       No ideas captured yet        │
│    Start by capturing your first   │
│    spark of content inspiration    │
│                                    │
│     [Capture Your First Idea]      │
│                                    │
└────────────────────────────────────┘
```

---

## Form Patterns

### 1. Inline Editing

**Pattern**: Click to edit, Enter to save, Escape to cancel
```
Display mode:  "My Series Title"  [edit icon on hover]
Edit mode:     [My Series Title___________] [✓] [✗]
```

### 2. Multi-Step Form

**Pattern**: Wizard with progress indicator
```
Step 1       Step 2       Step 3       Step 4
  ●───────────○───────────○───────────○
[Active]   [Pending]    [Pending]    [Pending]
```

### 3. Form Validation

**Pattern**: Real-time validation with inline errors
```
Label
┌──────────────────────────────┐
│ Invalid input here           │  ← border-destructive
└──────────────────────────────┘
⚠ Must be at least 3 characters   ← text-destructive text-sm
```

---

## Responsive Behavior Patterns

### Sidebar

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (< 768px) | Hidden, opens as overlay |
| Tablet (768-1024px) | Collapsed (icons only, w-16) |
| Desktop (> 1024px) | Expanded (w-64), collapsible |

### Data Tables

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Cards/list view (stacked) |
| Tablet | Reduced columns, horizontal scroll |
| Desktop | Full table with all columns |

### Kanban Board

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Single column, swipe between columns |
| Tablet | 2 visible columns, horizontal scroll |
| Desktop | All columns visible |

### Forms

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Full-width inputs, stacked |
| Tablet | 2-column grid where appropriate |
| Desktop | Comfortable max-width (640px) |

---

## Dark Mode Patterns

### Color Mapping Strategy

| Element | Light | Dark |
|---------|-------|------|
| Page background | White (`#FFFFFF`) | Near-black (`#0F0F14`) |
| Card surface | White | Slightly lighter (`#1A1A24`) |
| Primary text | Near-black (`#0A0A0B`) | Near-white (`#FAFAFA`) |
| Secondary text | Gray (`#6B7280`) | Light gray (`#A1A1AA`) |
| Borders | Light gray (`#E5E7EB`) | Dark gray (`#27272A`) |
| Primary accent | Cyan (`#06B6D4`) | Bright cyan (`#22D3EE`) |
| Hover surfaces | Light purple (`#F5F3FF`) | Dark gray (`#3F3F46`) |

### Implementation

```html
<!-- Always provide both variants -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <Card class="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
    <h3 class="text-gray-900 dark:text-gray-100">Title</h3>
    <p class="text-gray-500 dark:text-gray-400">Description</p>
  </Card>
</div>
```

---

## Scrollbar Styling

### Webkit Browsers
- Width: 8px
- Track: `bg-muted/30`
- Thumb: `bg-muted-foreground/30` with `rounded-full`
- Thumb hover: `bg-muted-foreground/50`

### Firefox
- `scrollbar-width: thin`
- `scrollbar-color: var(--muted-foreground) var(--muted)`

---

## Keyboard Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Cmd+K` | Quick capture / Command palette | Global |
| `Cmd+N` | New content piece | Pipeline |
| `Cmd+S` | Save current work | Editor |
| `Escape` | Close modal / Cancel edit | Global |
| `Tab` | Navigate between elements | Global |
| `Enter` | Confirm / Submit | Forms |
| `/` | Open search | Global |
| `?` | Show keyboard shortcuts | Global |

---

*Patterns create familiarity. Familiarity creates speed. Speed creates consistency.*
