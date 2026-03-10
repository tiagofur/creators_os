# Animation & Motion Guide — Ordo Creator OS

**Version:** 1.0  
**Date:** 2026-03-10  
**Status:** Complete Reference

---

## 1. Animation Philosophy

### Core Principles

Motion in Ordo Creator OS serves three purposes:

1. **Guide Attention** — Draw focus to important state changes or new content
   - Use entrance animations for modals, notifications, and loaded content
   - Highlight interactive elements on hover/focus
   - Direct eyes during multi-step processes (wizard flows, AI operations)

2. **Provide Feedback** — Confirm user actions have been registered
   - Button press response (scale + opacity feedback)
   - Toggle switches animating to their new state
   - Loading indicators showing active processing
   - Toast notifications confirming saves, uploads, completions

3. **Create Continuity** — Smooth transitions between states reduce cognitive load
   - Route transitions maintain visual continuity
   - List item reordering shows movement, not instant rearrangement
   - Shared element transitions connect related views
   - Expandable sections smoothly reveal content

### Performance-First Design

- **GPU-Accelerated Only:** Use only `transform` and `opacity` in animations
- **Avoid Layout Thrashing:** Never animate `width`, `height`, `left`, `top`, or `margin`
- **Hardware Acceleration:** 60 FPS on mobile, 120 FPS on desktop
- **Battery & CPU:** Subtle animations use less power than complex ones
- **Lazy Animation:** Don't animate off-screen elements

### Reduced Motion Support

Respect user accessibility preferences:

```tsx
// Hook to detect prefers-reduced-motion
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};
```

When `prefers-reduced-motion` is active, all animations become instant transitions without easing delays.

---

## 2. Framer Motion Setup

### Installation & Configuration

```bash
npm install framer-motion
```

### AnimatePresence for Exit Animations

Essential for animating components that unmount:

```tsx
import { AnimatePresence, motion } from 'framer-motion';

function ToastContainer({ notifications }: { notifications: Notification[] }) {
  return (
    <AnimatePresence>
      {notifications.map((notif) => (
        <motion.div
          key={notif.id}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
        >
          {notif.message}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

### LayoutGroup for Shared Layouts

Coordinate animations across siblings:

```tsx
import { LayoutGroup } from 'framer-motion';

function TabNavigation({ activeTab, setActiveTab }: TabProps) {
  return (
    <LayoutGroup id="tabs">
      <motion.div layout className="flex gap-4">
        {['Overview', 'Projects', 'Settings'].map((tab) => (
          <motion.button
            key={tab}
            layout
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'active' : ''}
          >
            {tab}
          </motion.button>
        ))}
      </motion.div>
    </LayoutGroup>
  );
}
```

### Shared Layout Animations

Connect elements across routes using `layoutId`:

```tsx
// On source page
<motion.div layoutId="project-card-123" className="project-card">
  <h2>My Project</h2>
</motion.div>

// On detail page
<AnimatePresence>
  {isDetailOpen && (
    <motion.div layoutId="project-card-123" className="project-detail">
      <h1>My Project</h1>
      {/* Content expands from card position to full detail */}
    </motion.div>
  )}
</AnimatePresence>
```

---

## 3. Design Tokens for Motion

### Duration Scale

Define a consistent timing system:

```typescript
// lib/motion-tokens.ts
export const MOTION_DURATION = {
  instant: 0,           // For prefers-reduced-motion
  fast: 150,            // Quick feedback (ms)
  normal: 250,          // Standard transitions
  slow: 400,            // Deliberate, emphasized animations
  verySlowMs: 600,      // Page transitions, large modals
} as const;

export const MOTION_DELAY = {
  none: 0,
  stagger: 50,          // Item stagger delay
  cascade: 100,         // Wave-like cascade
} as const;
```

### Easing Curves

Professional, purposeful easing:

```typescript
export const MOTION_EASING = {
  // Enter animations: ease-out (gentle acceleration)
  enter: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  
  // Exit animations: ease-in (quick fade)
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  
  // Spring physics (interactive elements)
  spring: {
    damping: 8,
    stiffness: 100,
    mass: 1,
    velocity: 0,
  },
  
  // Emphasis (draw attention)
  emphasis: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // Smooth deceleration
  smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
} as const;
```

### Using Tokens in Framer Motion

```tsx
import { MOTION_DURATION, MOTION_EASING } from '@/lib/motion-tokens';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

function AnimatedButton() {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  const duration = prefersReducedMotion ? 0 : MOTION_DURATION.normal;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        duration,
        ease: MOTION_EASING.smooth,
      }}
    >
      Click me
    </motion.button>
  );
}
```

---

## 4. Micro-Interactions

### Button Press & Hover

Professional button feedback:

```tsx
// components/AnimatedButton.tsx
export function AnimatedButton({
  children,
  onClick,
  disabled = false,
}: ButtonProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      transition={{
        duration: prefersReducedMotion ? 0 : MOTION_DURATION.fast,
        ease: MOTION_EASING.smooth,
      }}
      className="px-4 py-2 rounded-lg bg-primary text-white"
    >
      {children}
    </motion.button>
  );
}
```

### Toggle Switch

Smooth toggle with state feedback:

```tsx
// components/AnimatedToggle.tsx
export function AnimatedToggle({
  isEnabled,
  onChange,
}: {
  isEnabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.button
      onClick={() => onChange(!isEnabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        isEnabled ? 'bg-accent' : 'bg-neutral-700'
      }`}
      role="switch"
      aria-checked={isEnabled}
    >
      <motion.div
        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
        animate={{
          x: isEnabled ? 24 : 0,
        }}
        transition={{
          duration: prefersReducedMotion ? 0 : MOTION_DURATION.fast,
          ease: MOTION_EASING.spring,
        }}
      />
    </motion.button>
  );
}
```

### Checkbox with Checkmark

Animated checkbox with drawing effect:

```tsx
// components/AnimatedCheckbox.tsx
export function AnimatedCheckbox({
  isChecked,
  onChange,
}: {
  isChecked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.button
      onClick={() => onChange(!isChecked)}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
        isChecked ? 'bg-accent border-accent' : 'border-neutral-600'
      }`}
      role="checkbox"
      aria-checked={isChecked}
    >
      <AnimatePresence mode="wait">
        {isChecked && (
          <motion.svg
            key="checkmark"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          >
            <motion.path
              d="M2 8l4 4 8-8"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
```

### Tooltip Appear

Smooth tooltip with delay:

```tsx
// components/AnimatedTooltip.tsx
export function AnimatedTooltip({
  trigger,
  content,
  side = 'top',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="relative inline-block">
      <div onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
        {trigger}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{
              duration: prefersReducedMotion ? 0 : MOTION_DURATION.fast,
              delay: prefersReducedMotion ? 0 : 0.2,
            }}
            className="absolute whitespace-nowrap bg-neutral-900 text-white px-3 py-2 rounded-lg text-sm z-50"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Dropdown Open

Menu expand with list animation:

```tsx
// components/AnimatedDropdown.tsx
export function AnimatedDropdown({
  trigger,
  items,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -8 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative inline-block">
      <button onClick={() => setIsOpen(!isOpen)}>{trigger}</button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="absolute top-full left-0 mt-2 bg-neutral-800 rounded-lg shadow-lg"
          >
            {items.map((item, index) => (
              <motion.button
                key={index}
                variants={itemVariants}
                className="block w-full text-left px-4 py-2 hover:bg-neutral-700"
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
              >
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Menu Expand (Hamburger)

Animated hamburger menu with drawer:

```tsx
// components/AnimatedMenu.tsx
export function AnimatedMenu({ items }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2"
      >
        <motion.div
          animate={isOpen ? 'open' : 'closed'}
          variants={{
            open: { rotate: 45 },
            closed: { rotate: 0 },
          }}
          transition={{ duration: prefersReducedMotion ? 0 : MOTION_DURATION.fast }}
        >
          ☰
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Menu Drawer */}
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{
                duration: prefersReducedMotion ? 0 : MOTION_DURATION.normal,
                ease: MOTION_EASING.smooth,
              }}
              className="fixed left-0 top-0 h-full w-64 bg-neutral-900 z-50"
            >
              {items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: prefersReducedMotion ? 0 : index * 0.05 }}
                >
                  <a href={item.href} className="block px-4 py-2">
                    {item.label}
                  </a>
                </motion.div>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## 5. Page Transitions

### Route Transition Variants

Implement consistent page transitions:

```typescript
// lib/page-transition-variants.ts
export const pageTransitionVariants = {
  enter: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
};

export const pageTransitionTransition = {
  duration: 0.3,
  ease: 'easeInOut',
};
```

### Page Wrapper Component

```tsx
// components/PageTransition.tsx
export function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="enter"
      animate="animate"
      exit="exit"
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : pageTransitionTransition
      }
    >
      {children}
    </motion.div>
  );
}
```

### Using with Next.js

```tsx
// app/layout.tsx
import { AnimatePresence } from 'framer-motion';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <AnimatePresence mode="wait">
          <PageTransition key={usePathname()}>
            {children}
          </PageTransition>
        </AnimatePresence>
      </body>
    </html>
  );
}
```

### Exit/Enter Animations with Stagger

```tsx
// hooks/usePageTransition.ts
export function usePageTransition() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return {
    containerVariants: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: prefersReducedMotion ? 0 : 0.1,
        },
      },
      exit: {
        opacity: 0,
        transition: {
          staggerChildren: prefersReducedMotion ? 0 : 0.05,
          staggerDirection: -1,
        },
      },
    },
    itemVariants: {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
  };
}
```

---

## 6. List Animations

### Stagger Children on Load

Load a media grid with cascading animation:

```tsx
// components/MediaGrid.tsx
export function MediaGrid({ items }: MediaGridProps) {
  const { containerVariants, itemVariants } = usePageTransition();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-4"
    >
      {items.map((item) => (
        <motion.div
          key={item.id}
          variants={itemVariants}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.3,
          }}
          className="aspect-square bg-neutral-800 rounded-lg overflow-hidden"
        >
          <img src={item.src} alt={item.alt} className="w-full h-full object-cover" />
        </motion.div>
      ))}
    </motion.div>
  );
}
```

### Item Add/Remove in Lists

Animate addition and removal of project items:

```tsx
// components/ProjectList.tsx
export function ProjectList({ projects }: ProjectListProps) {
  const [localProjects, setLocalProjects] = useState(projects);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleRemoveProject = (id: string) => {
    setLocalProjects(localProjects.filter((p) => p.id !== id));
  };

  const handleAddProject = (project: Project) => {
    setLocalProjects([...localProjects, project]);
  };

  return (
    <motion.ul className="space-y-2">
      <AnimatePresence>
        {localProjects.map((project) => (
          <motion.li
            key={project.id}
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: -20, height: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : MOTION_DURATION.normal,
            }}
            className="overflow-hidden"
          >
            <div className="flex justify-between items-center p-3 bg-neutral-800 rounded">
              <span>{project.name}</span>
              <button onClick={() => handleRemoveProject(project.id)}>Remove</button>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
```

### Reorder with Drag and Drop

Animate reordering during drag:

```tsx
// components/DraggableList.tsx
import { Reorder } from 'framer-motion';

export function DraggableList({ items, onReorder }: DraggableListProps) {
  const [list, setList] = useState(items);

  return (
    <Reorder.Group values={list} onReorder={setList} className="space-y-2">
      {list.map((item) => (
        <Reorder.Item
          key={item.id}
          value={item}
          className="bg-neutral-800 p-3 rounded cursor-grab active:cursor-grabbing"
        >
          <span>{item.name}</span>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
```

---

## 7. Loading States

### Skeleton Shimmer

Animated skeleton loaders:

```tsx
// components/SkeletonShimmer.tsx
export function SkeletonShimmer({
  width = 'w-full',
  height = 'h-4',
  className = '',
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <motion.div
      className={`${width} ${height} bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded ${className}`}
      animate={{
        backgroundPosition: ['0% 0%', '100% 0%'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        backgroundSize: '200% 100%',
      }}
    />
  );
}

// Usage
export function SkeletonCard() {
  return (
    <div className="p-4 bg-neutral-800 rounded-lg space-y-3">
      <SkeletonShimmer height="h-6" width="w-2/3" />
      <SkeletonShimmer height="h-4" width="w-full" />
      <SkeletonShimmer height="h-4" width="w-5/6" />
    </div>
  );
}
```

### Spinner

Rotating spinner for loading:

```tsx
// components/Spinner.tsx
export function Spinner({
  size = 'w-8 h-8',
  color = 'text-accent',
}: {
  size?: string;
  color?: string;
}) {
  return (
    <motion.div
      className={`${size} ${color}`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.2" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}
```

### Progress Bar Fill

Animated progress indicator:

```tsx
// components/ProgressBar.tsx
export function ProgressBar({
  progress = 0,
  animated = true,
}: {
  progress: number;
  animated?: boolean;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="w-full h-1 bg-neutral-700 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-accent to-accent-light"
        animate={{ width: `${progress}%` }}
        transition={{
          duration: prefersReducedMotion || !animated ? 0 : MOTION_DURATION.normal,
          ease: MOTION_EASING.smooth,
        }}
      />
    </div>
  );
}
```

### Content Fade-In on Load

Fade in content when ready:

```tsx
// components/ContentLoader.tsx
export function ContentLoader({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div key="loading" className="space-y-4">
          <SkeletonShimmer height="h-6" />
          <SkeletonShimmer height="h-4" />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: prefersReducedMotion ? 0 : MOTION_DURATION.normal,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## 8. Notification Animations

### Toast Slide-In/Out

Animated notifications:

```tsx
// components/Toast.tsx
export function Toast({
  id,
  message,
  type = 'info',
  onClose,
}: {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-green-900/80',
    error: 'bg-red-900/80',
    info: 'bg-blue-900/80',
    warning: 'bg-yellow-900/80',
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, y: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{
        duration: prefersReducedMotion ? 0 : MOTION_DURATION.normal,
      }}
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg`}
      role="status"
    >
      {message}
    </motion.div>
  );
}

// Toast Container
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

### Notification Bell Shake

Shake animation for alerts:

```tsx
// components/NotificationBell.tsx
export function NotificationBell({
  count = 0,
  onClick,
}: {
  count?: number;
  onClick: () => void;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      animate={count > 0 && !prefersReducedMotion ? 'shake' : 'normal'}
      variants={{
        normal: { rotate: 0 },
        shake: {
          rotate: [0, -15, 15, -15, 0],
        },
      }}
      transition={{
        duration: 0.5,
        ease: MOTION_EASING.emphasis,
      }}
      className="relative p-2"
    >
      <span className="text-xl">🔔</span>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center"
          >
            {count > 99 ? '99+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
```

### Badge Count Increment

Animated number counter:

```tsx
// components/AnimatedBadge.tsx
export function AnimatedBadge({
  count,
}: {
  count: number;
}) {
  return (
    <motion.span className="inline-block bg-accent text-white px-2 py-1 rounded-full text-sm">
      <motion.span
        key={count}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {count}
      </motion.span>
    </motion.span>
  );
}
```

---

## 9. Modal & Dialog

### Backdrop Fade

Animated modal backdrop:

```tsx
// components/Modal.tsx
export function Modal({
  isOpen,
  onClose,
  children,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-40"
            transition={{
              duration: prefersReducedMotion ? 0 : MOTION_DURATION.fast,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              duration: prefersReducedMotion ? 0 : MOTION_DURATION.normal,
              ease: MOTION_EASING.smooth,
            }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neutral-800 rounded-lg shadow-xl p-6 max-w-md w-full z-50"
            role="dialog"
            aria-labelledby="modal-title"
          >
            {title && (
              <h2 id="modal-title" className="text-xl font-semibold mb-4">
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Slide-Up Sheet (Mobile)

Bottom sheet animation for mobile:

```tsx
// components/BottomSheet.tsx
export function BottomSheet({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
            transition={{
              duration: prefersReducedMotion ? 0 : MOTION_DURATION.fast,
            }}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              duration: prefersReducedMotion ? 0 : MOTION_DURATION.normal,
              ease: MOTION_EASING.smooth,
            }}
            className="fixed bottom-0 left-0 right-0 bg-neutral-800 rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto z-50"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Drawer Slide

Side drawer animation:

```tsx
// components/Drawer.tsx
export function Drawer({
  isOpen,
  onClose,
  children,
  side = 'left',
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const slideDirection = side === 'left' ? '-100%' : '100%';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
            transition={{
              duration: prefersReducedMotion ? 0 : MOTION_DURATION.fast,
            }}
          />

          <motion.div
            initial={{ x: slideDirection }}
            animate={{ x: 0 }}
            exit={{ x: slideDirection }}
            transition={{
              duration: prefersReducedMotion ? 0 : MOTION_DURATION.normal,
              ease: MOTION_EASING.smooth,
            }}
            className={`fixed top-0 ${side}-0 h-full w-80 bg-neutral-800 shadow-xl z-50 overflow-y-auto`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 10. Scroll-Based Animations

### Parallax Effect

Depth-based parallax on scroll:

```tsx
// hooks/useParallax.ts
import { useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function useParallax(offset = 50) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, offset]);

  return { ref, y };
}

// Component
export function ParallaxImage({ src }: { src: string }) {
  const { ref, y } = useParallax(100);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className="overflow-hidden"
    >
      <img src={src} alt="" className="w-full" />
    </motion.div>
  );
}
```

### Reveal on Scroll

Fade in elements when they scroll into view:

```tsx
// hooks/useRevealOnScroll.ts
import { useMotionTemplate, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function useRevealOnScroll() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['0 1', '1.2 1'],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return { ref, opacity };
}

// Component
export function RevealSection({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ref, opacity } = useRevealOnScroll();

  return (
    <motion.section
      ref={ref}
      style={{ opacity }}
      className="py-12"
    >
      {children}
    </motion.section>
  );
}
```

### Sticky Header Transform

Transform header on scroll:

```tsx
// components/StickyHeader.tsx
export function StickyHeader() {
  const { scrollY } = useScroll();
  const headerHeight = useTransform(scrollY, [0, 100], [80, 60]);
  const fontSize = useTransform(scrollY, [0, 100], [24, 18]);

  return (
    <motion.header
      style={{ height: headerHeight }}
      className="sticky top-0 bg-neutral-900 z-30 flex items-center px-6"
    >
      <motion.h1 style={{ fontSize }} className="font-bold">
        Projects
      </motion.h1>
    </motion.header>
  );
}
```

### Progress Indicator

Scroll progress bar:

```tsx
// components/ScrollProgress.tsx
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      style={{ scaleX: scrollYProgress, transformOrigin: 'left' }}
      className="fixed top-0 left-0 right-0 h-1 bg-accent z-50"
    />
  );
}
```

---

## 11. AI Operation Animations

### Streaming Text Cursor

Animated cursor during text streaming:

```tsx
// components/StreamingText.tsx
export function StreamingText({
  text,
  isStreaming = true,
}: {
  text: string;
  isStreaming?: boolean;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="inline">
      {text}
      <AnimatePresence>
        {isStreaming && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.6,
              repeat: Infinity,
            }}
            className="ml-1 inline-block w-2 h-5 bg-accent"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Processing Pulse

Pulsing indicator for active processing:

```tsx
// components/ProcessingPulse.tsx
export function ProcessingPulse({
  label = 'Processing...',
}: {
  label?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="w-3 h-3 rounded-full bg-accent"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{
          duration: prefersReducedMotion ? 0 : 1,
          repeat: Infinity,
        }}
      />
      <span className="text-sm text-neutral-400">{label}</span>
    </div>
  );
}
```

### Thinking Indicator

Multi-dot thinking animation:

```tsx
// components/ThinkingIndicator.tsx
export function ThinkingIndicator() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-neutral-600"
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: prefersReducedMotion ? 0 : 1.4,
            repeat: Infinity,
            delay: prefersReducedMotion ? 0 : i * 0.2,
          }}
        />
      ))}
    </div>
  );
}
```

### Completion Celebration

Celebration animation on completion:

```tsx
// components/CompletionCelebration.tsx
export function CompletionCelebration({
  show = true,
}: {
  show?: boolean;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.5,
            type: 'spring',
            stiffness: 100,
          }}
          className="text-4xl text-center my-4"
        >
          ✨
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## 12. React Native Reanimated

### Setup & Configuration

```bash
npm install react-native-reanimated react-native-gesture-handler
```

Add to `babel.config.js`:

```javascript
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['react-native-reanimated/plugin'],
};
```

### Worklets & Shared Values

Animated calculations on the UI thread:

```tsx
// lib/animated-utils.ts
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedReaction,
} from 'react-native-reanimated';

export function useAnimatedButton() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 8 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 8 });
  };

  return { animatedStyle, handlePressIn, handlePressOut };
}
```

### Gesture Handler Integration

Interactive animations with gestures:

```tsx
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

export function SwipeCard() {
  const translateX = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
    },
    onEnd: () => {
      if (Math.abs(translateX.value) > 100) {
        // Swipe completed
        translateX.value = withSpring(300, { damping: 8 });
      } else {
        // Return to start
        translateX.value = withSpring(0, { damping: 8 });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.card, animatedStyle]} />
    </PanGestureHandler>
  );
}
```

### Bottom Sheet Animation

Reanimated-based bottom sheet:

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

export function AnimatedBottomSheet({
  isVisible,
  onClose,
  children,
}: BottomSheetProps) {
  const translateY = useSharedValue(isVisible ? 0 : 300);

  useEffect(() => {
    translateY.value = withSpring(isVisible ? 0 : 300, { damping: 8 });
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const gestureHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    },
    onEnd: (event) => {
      if (event.translationY > 50) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 8 });
      }
    },
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.sheet, animatedStyle]}>
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
}
```

### Tab Bar Animations

Animated tab indicator:

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

export function AnimatedTabBar({
  tabs,
  activeIndex,
  onTabChange,
}: TabBarProps) {
  const indicatorPosition = useSharedValue(0);

  useEffect(() => {
    indicatorPosition.value = withTiming(activeIndex * TAB_WIDTH, {
      duration: 250,
    });
  }, [activeIndex]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
  }));

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => (
        <Pressable
          key={index}
          onPress={() => onTabChange(index)}
          style={styles.tab}
        >
          <Text style={{ fontWeight: activeIndex === index ? 'bold' : 'normal' }}>
            {tab}
          </Text>
        </Pressable>
      ))}
      <Animated.View
        style={[styles.indicator, animatedIndicatorStyle]}
      />
    </View>
  );
}
```

---

## 13. Reduced Motion Support

### Detection & Fallback

Comprehensive reduced motion handling:

```typescript
// lib/motion-config.ts
export function getMotionConfig(prefersReducedMotion: boolean) {
  return {
    duration: prefersReducedMotion ? 0 : MOTION_DURATION.normal,
    delay: prefersReducedMotion ? 0 : MOTION_DELAY.stagger,
    ease: MOTION_EASING.smooth,
    transition: prefersReducedMotion ? { duration: 0 } : undefined,
  };
}
```

### Provider Wrapper

Context for accessing reduced motion preference globally:

```tsx
// hooks/useMotionPreference.ts
import { createContext, useContext, useState, useEffect } from 'react';

const MotionContext = createContext<{
  prefersReducedMotion: boolean;
}>({ prefersReducedMotion: false });

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <MotionContext.Provider value={{ prefersReducedMotion }}>
      {children}
    </MotionContext.Provider>
  );
}

export function useMotion() {
  return useContext(MotionContext);
}
```

### Instant Transitions Fallback

All animations become instant when disabled:

```tsx
export function AnimatedComponent({ children }: { children: React.ReactNode }) {
  const { prefersReducedMotion } = useMotion();

  if (prefersReducedMotion) {
    // Render without animation wrapper
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: MOTION_DURATION.normal }}
    >
      {children}
    </motion.div>
  );
}
```

---

## 14. Performance Guidelines

### GPU-Accelerated Properties Only

**DO use** (GPU accelerated):
- `transform` (translate, scale, rotate, skew)
- `opacity`

**AVOID** (causes repaints/reflows):
- `width`, `height`
- `left`, `top`, `right`, `bottom`
- `margin`, `padding`
- `color`, `background-color`
- `font-size`

### Optimize with `will-change`

```css
.animated-element {
  will-change: transform, opacity;
}
```

In Framer Motion:

```tsx
<motion.div
  animate={{ x: 100 }}
  style={{ willChange: 'transform' }}
/>
```

### Avoid Layout Thrashing

Don't animate properties that trigger layout:

```tsx
// BAD: Causes layout shift
<motion.div animate={{ width: 200 }} />

// GOOD: Use transform + scale
<motion.div
  animate={{ scale: 1.2 }}
  style={{ transformOrigin: 'center' }}
/>
```

### When to Use CSS vs Framer Motion

| Use Case | Tool | Reason |
|----------|------|--------|
| Hover/focus states | CSS | Always available, no JS overhead |
| Simple transitions | CSS | Lighter than JS animation library |
| Complex orchestration | Framer Motion | Superior sequencing & control |
| Scroll-based animations | Framer Motion | Built-in scroll tracking |
| Gesture-based (mobile) | Reanimated | Worklet optimization |
| Microinteractions | CSS + Framer Motion | Hybrid for best performance |

---

## 15. Animation Components Library

### FadeIn Component

```tsx
// components/animations/FadeIn.tsx
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { MOTION_DURATION, MOTION_EASING } from '@/lib/motion-tokens';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export function FadeIn({
  children,
  delay = 0,
  duration = MOTION_DURATION.normal,
  direction = 'up',
}: FadeInProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const offset = {
    up: { x: 0, y: 20 },
    down: { x: 0, y: -20 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
  }[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : duration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: MOTION_EASING.enter,
      }}
    >
      {children}
    </motion.div>
  );
}
```

### SlideIn Component

```tsx
// components/animations/SlideIn.tsx
export function SlideIn({
  children,
  direction = 'left',
  delay = 0,
  duration = MOTION_DURATION.normal,
}: SlideInProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const variants = {
    left: { x: -100 },
    right: { x: 100 },
    up: { y: 100 },
    down: { y: -100 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...variants[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : duration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: MOTION_EASING.enter,
      }}
    >
      {children}
    </motion.div>
  );
}
```

### ScaleIn Component

```tsx
// components/animations/ScaleIn.tsx
export function ScaleIn({
  children,
  delay = 0,
  duration = MOTION_DURATION.normal,
}: ScaleInProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: prefersReducedMotion ? 0 : duration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: MOTION_EASING.enter,
      }}
    >
      {children}
    </motion.div>
  );
}
```

### StaggerList Component

```tsx
// components/animations/StaggerList.tsx
interface StaggerListProps {
  items: Array<{ id: string; content: React.ReactNode }>;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
}

export function StaggerList({
  items,
  direction = 'up',
  delay = MOTION_DELAY.stagger,
}: StaggerListProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : delay / 1000,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, ...(direction === 'up' && { y: 20 }) },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {items.map((item) => (
        <motion.li key={item.id} variants={itemVariants}>
          {item.content}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### AnimatedCounter Component

```tsx
// components/animations/AnimatedCounter.tsx
export function AnimatedCounter({
  from = 0,
  to = 100,
  duration = MOTION_DURATION.slow,
}: {
  from?: number;
  to: number;
  duration?: number;
}) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(from, to, {
      duration: duration / 1000,
      onUpdate: (value) => {
        node.textContent = Math.floor(value).toString();
      },
    });

    return () => controls.stop();
  }, [from, to, duration]);

  return <span ref={nodeRef}>{from}</span>;
}
```

### Skeleton Loader Component

```tsx
// components/animations/SkeletonLoader.tsx
interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  count?: number;
  circle?: boolean;
}

export function SkeletonLoader({
  width = 'w-full',
  height = 'h-4',
  count = 1,
  circle = false,
}: SkeletonLoaderProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`${width} ${height} ${
            circle ? 'rounded-full' : 'rounded'
          } bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700`}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  backgroundPosition: ['0% 0%', '100% 0%'],
                }
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            backgroundSize: '200% 100%',
          }}
        />
      ))}
    </div>
  );
}
```

---

## Summary & Best Practices

### Checklist

- ✅ All animations respect `prefers-reduced-motion`
- ✅ Use only GPU-accelerated properties (transform, opacity)
- ✅ Animations serve clear purpose (guide attention, feedback, continuity)
- ✅ Use motion tokens for consistency (duration, easing)
- ✅ Stagger entrance animations for visual hierarchy
- ✅ Provide instant feedback for user interactions
- ✅ Test on low-end mobile devices
- ✅ Performance-monitor with DevTools (60 FPS target)
- ✅ Dark mode compatible (use design system colors)
- ✅ Animations are optional, not essential to UX

### Motion Design Resources

- **Framer Motion Docs:** https://www.framer.com/motion/
- **React Native Reanimated:** https://docs.swmansion.com/react-native-reanimated/
- **Web Animation Best Practices:** https://web.dev/animations-guide/
- **Accessible Animations:** https://www.a11y-101.com/design/animations

---

**Version History:**
- v1.0 (2026-03-10): Complete reference with all patterns and components
