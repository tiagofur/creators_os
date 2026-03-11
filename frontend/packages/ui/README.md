# @ordo/ui

Shared UI component library for Creators OS. Built on Radix UI primitives, styled with Tailwind CSS and `class-variance-authority` (CVA).

## Available components

### Form controls
- **Button** — primary action button with variants (default, destructive, outline, secondary, ghost, link) and sizes
- **Input** — text input field
- **Textarea** — multiline text input
- **Select** — dropdown select (Radix UI)
- **Checkbox** — toggle checkbox (Radix UI)
- **Switch** — toggle switch (Radix UI)
- **Form** — form wrapper integrating `react-hook-form` with label, message, and description slots
- **Label** — accessible form label

### Layout and data display
- **Card** — content card with header, content, footer, title, and description sub-components
- **Badge** — status/tag badge with variants
- **Avatar** — user avatar with image and fallback
- **Skeleton** — loading placeholder
- **Separator** — horizontal/vertical divider
- **Spinner** — loading spinner indicator

### Overlays
- **Dialog** — modal dialog (Radix UI)
- **Sheet** — slide-out panel (Radix UI)
- **DropdownMenu** — context/action menu (Radix UI)
- **Tooltip** — hover tooltip (Radix UI)
- **Popover** — click-triggered popover (Radix UI)
- **Toast / Toaster** — notification toasts with `useToast` hook

## Adding a new component

### 1. Create the component file

Add `src/components/my-component.tsx`:

```tsx
'use client';

import * as React from 'react';
import { cn } from '@ordo/core';

export interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent';
}

const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'base-classes-here',
        variant === 'accent' && 'accent-classes',
        className,
      )}
      {...props}
    />
  ),
);
MyComponent.displayName = 'MyComponent';

export { MyComponent };
```

### 2. Export from the barrel

Add to `src/index.ts`:

```ts
export { MyComponent } from './components/my-component';
export type { MyComponentProps } from './components/my-component';
```

### Naming conventions

- File names: kebab-case (`dropdown-menu.tsx`)
- Component names: PascalCase (`DropdownMenu`)
- Use `React.forwardRef` for all leaf components
- Set `displayName` for dev-tools readability
- Accept and forward `className` using the `cn()` utility from `@ordo/core`
- Use `'use client'` directive for components that use hooks or browser APIs

### File structure

```
src/
  components/
    button.tsx
    input.tsx
    ...
  __tests__/
    button.test.tsx
    input.test.tsx
    ...
    setup.ts          # Test setup (testing-library, jest-dom)
  index.ts            # Public barrel export
```

## Testing

Tests live in `src/__tests__/` and use Vitest + React Testing Library + `@testing-library/jest-dom`.

Run tests:

```bash
pnpm test           # single run
pnpm test:watch     # watch mode
```

Each test file covers rendering, user interactions, and accessibility basics for a single component. Follow the existing pattern when adding tests for new components.
