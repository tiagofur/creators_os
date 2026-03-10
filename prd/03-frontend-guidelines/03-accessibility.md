# Accessibility Standards

> WCAG AA compliance requirements for Ordo Creator OS.

---

## Compliance Level

**Target: WCAG 2.1 Level AA**

This is not optional. Every feature, every component, every page must meet these standards.

---

## Core Requirements

### 1. Perceivable

#### Color Contrast

| Text Size | Minimum Ratio | Tool |
|-----------|--------------|------|
| Normal text (< 18px) | **4.5:1** | WebAIM Contrast Checker |
| Large text (>= 18px bold, >= 24px) | **3:1** | WebAIM Contrast Checker |
| UI components & graphical objects | **3:1** | WebAIM Contrast Checker |

**Our palette compliance:**

| Combination | Ratio | Pass? |
|------------|-------|-------|
| Foreground on Background (light) | 19.3:1 | YES |
| Foreground on Background (dark) | 17.1:1 | YES |
| Primary on Background (light) | 4.5:1 | YES |
| Primary on Background (dark) | 7.2:1 | YES |
| Muted-foreground on Background (light) | 5.1:1 | YES |
| Muted-foreground on Background (dark) | 6.8:1 | YES |

**Rules:**
- Never rely on color alone to convey information (use icons + text)
- Status indicators: Color + icon + text label
- Chart data: Color + pattern + label
- Error states: Red border + error icon + text message

#### Text Alternatives

```html
<!-- Images -->
<Image src={thumbnail} alt="CSS Grid Tutorial thumbnail showing code editor" />

<!-- Decorative images -->
<Image src={decoration} alt="" role="presentation" />

<!-- Icons with meaning -->
<button aria-label="Delete idea">
  <TrashIcon aria-hidden="true" />
</button>

<!-- Icons that are decorative -->
<span><CheckIcon aria-hidden="true" /> Completed</span>
```

#### Media

- All video content: Captions required
- Audio content: Transcript available
- Animations: Respect `prefers-reduced-motion`

### 2. Operable

#### Keyboard Navigation

**Every interactive element must be:**
- Reachable via `Tab` key
- Activatable via `Enter` or `Space`
- Dismissable via `Escape` (modals, dropdowns)
- Navigable via arrow keys (menus, tabs, grids)

**Focus Order:**
```
Tab: left-to-right, top-to-bottom (natural reading order)
Shift+Tab: Reverse direction
Modal open: Focus trapped inside modal
Modal close: Focus returns to trigger element
```

**Focus Indicators:**
```css
*:focus-visible {
  outline: 2px solid var(--ring);  /* Primary cyan */
  outline-offset: 2px;
}

/* Never remove focus indicators */
/* :focus { outline: none } is FORBIDDEN */
```

**Skip Links:**
```html
<!-- First element on every page -->
<a href="#main-content" class="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

#### Touch Targets

```
Minimum: 44px x 44px (WCAG)
Recommended: 48px x 48px (Material Design)
Spacing between targets: 8px minimum
```

#### Timing

- No time limits on content reading
- Auto-dismiss toasts: Minimum 5 seconds, pausable on hover
- Session timeouts: Warning 60 seconds before
- Animations: Pausable, < 5 seconds unless user-triggered

### 3. Understandable

#### Language

```html
<html lang="en">  <!-- Set per locale -->
<html lang="es">
<html lang="pt">
```

#### Consistent Navigation

- Sidebar order never changes between pages
- Same actions in the same position across similar pages
- Predictable behavior (links navigate, buttons act)

#### Error Prevention

```html
<!-- Clear labels -->
<label htmlFor="title">Idea Title</label>
<input id="title" type="text" required aria-required="true" />

<!-- Descriptive errors -->
<p role="alert" class="text-destructive text-sm">
  Title must be at least 3 characters
</p>

<!-- Confirmation for destructive actions -->
<Dialog>
  <p>Delete "CSS Grid Tutorial"?</p>
  <p>This cannot be undone.</p>
  <Button variant="ghost">Cancel</Button>
  <Button variant="destructive">Delete</Button>
</Dialog>
```

#### Form Labels

```html
<!-- Every input needs a label -->
<label htmlFor="email">Email address</label>
<input id="email" type="email" aria-describedby="email-help" />
<p id="email-help" class="text-muted-foreground text-sm">
  We'll send login credentials to this email
</p>

<!-- Required fields -->
<label htmlFor="name">
  Name <span aria-label="required">*</span>
</label>
<input id="name" required aria-required="true" />
```

### 4. Robust

#### Semantic HTML

```html
<!-- Use correct elements -->
<header>  <!-- Page header -->
<nav>     <!-- Navigation -->
<main>    <!-- Main content -->
<aside>   <!-- Sidebar -->
<footer>  <!-- Page footer -->
<section> <!-- Content sections -->
<article> <!-- Self-contained content -->

<!-- Heading hierarchy (never skip levels) -->
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>
  <h2>Another Section</h2>
```

#### ARIA Landmarks

```html
<header role="banner">
<nav role="navigation" aria-label="Main navigation">
<main role="main" id="main-content">
<aside role="complementary" aria-label="Sidebar">
<footer role="contentinfo">
```

#### ARIA for Dynamic Content

```html
<!-- Live regions for async updates -->
<div aria-live="polite" aria-atomic="true">
  <!-- Toast notifications -->
  Idea "CSS Grid" created successfully
</div>

<!-- Loading states -->
<div aria-busy="true" aria-live="polite">
  Loading ideas...
</div>

<!-- Expandable content -->
<button aria-expanded="false" aria-controls="details-panel">
  Show details
</button>
<div id="details-panel" hidden>
  Details content
</div>

<!-- Tab panels -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">Tab 2</button>
</div>
<div role="tabpanel" id="panel-1">Content 1</div>
<div role="tabpanel" id="panel-2" hidden>Content 2</div>
```

---

## Component Accessibility Patterns

### Button

```html
<button type="button" aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>

<!-- Loading state -->
<button disabled aria-busy="true">
  <Spinner aria-hidden="true" />
  Creating...
</button>
```

### Modal/Dialog

```html
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Create New Idea</h2>
  <!-- Focus trapped inside -->
  <!-- Escape closes -->
  <!-- Focus returns to trigger on close -->
</div>
```

### Dropdown/Menu

```html
<div>
  <button aria-haspopup="true" aria-expanded="false">Options</button>
  <ul role="menu">
    <li role="menuitem" tabindex="-1">Edit</li>
    <li role="menuitem" tabindex="-1">Delete</li>
  </ul>
</div>
```

### Data Table

```html
<table role="table">
  <caption class="sr-only">List of content ideas</caption>
  <thead>
    <tr>
      <th scope="col">Title</th>
      <th scope="col">Status</th>
      <th scope="col" aria-sort="ascending">Created</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>CSS Grid Tutorial</td>
      <td><Badge>Active</Badge></td>
      <td>March 10, 2026</td>
    </tr>
  </tbody>
</table>
```

### Kanban Board

```html
<div role="region" aria-label="Content Pipeline">
  <div role="list" aria-label="Scripting column">
    <div role="listitem" draggable="true" aria-grabbed="false">
      Card content
    </div>
  </div>
</div>
```

---

## High Contrast & Reduced Motion

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  /* Increase border widths */
  * { border-width: 2px; }

  /* Ensure all text meets 7:1 ratio */
  .text-muted-foreground {
    color: var(--foreground); /* Upgrade to full contrast */
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Screen Reader Testing

### Tools

| Platform | Tool |
|----------|------|
| macOS | VoiceOver (built-in) |
| Windows | NVDA (free) or JAWS |
| Mobile iOS | VoiceOver |
| Mobile Android | TalkBack |

### Test Scenarios

1. **Navigate the sidebar**: All items announced with role and state
2. **Create an idea**: Form labels, required fields, error messages announced
3. **Move Kanban card**: Drag-drop has keyboard alternative, state changes announced
4. **Read analytics**: Charts have text descriptions, numbers announced
5. **Receive notification**: Toast announced via live region

---

## Accessibility Checklist

Before shipping any page:

- [ ] All images have appropriate alt text
- [ ] All form inputs have associated labels
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible on all elements
- [ ] Color contrast meets 4.5:1 (normal text) or 3:1 (large text)
- [ ] Color is not the sole means of conveying information
- [ ] Heading hierarchy is logical (no skipped levels)
- [ ] ARIA landmarks are properly used
- [ ] Dynamic content updates are announced (aria-live)
- [ ] Modals trap focus and return focus on close
- [ ] Skip link is present and functional
- [ ] Page has a descriptive `<title>`
- [ ] Language attribute is set on `<html>`
- [ ] Reduced motion preference is respected
- [ ] Touch targets are at least 44px x 44px

---

*Accessibility is not a feature. It's a fundamental requirement of good software.*
