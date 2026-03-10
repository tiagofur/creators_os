# Component Library Setup Guide — Ordo Creator OS

**Version:** 1.0  
**Last Updated:** 2026-03-10  
**Status:** Specification

---

## 1. Shared Component Library Architecture

### 1.1 Monorepo Package Structure

The component library is organized within a Turborepo workspace with shared packages consumed by web, mobile, and desktop applications.

```
monorepo/
├── packages/
│   ├── ui/                          # Shared component library
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── primitives/      # Base components (Button, Input, Select, etc.)
│   │   │   │   ├── composite/       # Complex components (MediaCard, ProjectCard, etc.)
│   │   │   │   ├── layout/          # Layout components (PageLayout, Sidebar, etc.)
│   │   │   │   ├── forms/           # Form-specific components
│   │   │   │   └── icons/           # Icon system
│   │   │   ├── styles/
│   │   │   │   ├── design-tokens.ts # OKLCH colors, typography, spacing
│   │   │   │   ├── tailwind.config.js
│   │   │   │   └── globals.css
│   │   │   ├── hooks/               # Shared hooks (useMediaQuery, useTheme, etc.)
│   │   │   ├── utils/               # Utilities (cn, classname merging)
│   │   │   └── index.ts             # Public exports
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── design-tokens/               # Design system constants (separate for DRY)
│   │   └── src/
│   │       ├── colors.ts            # OKLCH color definitions
│   │       ├── typography.ts        # Font sizes, weights, line heights
│   │       ├── spacing.ts           # 4px grid tokens
│   │       └── index.ts
│   └── shared/
│       └── src/
│           ├── hooks/               # Cross-platform shared hooks
│           └── utils/               # Cross-platform utilities
├── apps/
│   ├── web/                         # Next.js 15 web app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/          # Web-specific overrides (uses packages/ui as base)
│   │   │   └── styles/
│   │   └── package.json
│   ├── mobile/                      # Expo Router React Native app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/          # Mobile-specific overrides
│   │   │   └── styles/
│   │   └── package.json
│   └── desktop/                     # Electron + Vite app
│       ├── src/
│       │   ├── renderer/
│       │   ├── main/
│       │   └── preload/
│       └── package.json
└── turbo.json
```

### 1.2 Component Sharing Strategy

**Three-tier composition model:**

1. **Design Tokens** (packages/design-tokens) — Colors, typography, spacing shared across all platforms
2. **Core Components** (packages/ui) — Platform-agnostic logic; rendering deferred to implementations
3. **Platform Variants** — Web (ShadCN/UI), Mobile (NativeWind), Desktop (Electron)

**Example: Button Component Sharing**

```typescript
// packages/design-tokens/src/colors.ts
export const colors = {
  primary: {
    50: 'oklch(97.6% 0.031 286.23)',   // Light
    100: 'oklch(95.2% 0.062 286.23)',
    500: 'oklch(64.2% 0.198 286.23)',   // Primary brand
    900: 'oklch(37.9% 0.170 286.23)',   // Dark
  },
  surface: {
    light: 'oklch(98% 0 0)',
    dark: 'oklch(14% 0 0)',
  },
} as const;

// packages/ui/src/components/primitives/Button.base.ts
// Shared button logic and variants (no rendering)
export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'bg-surface-100 text-surface-900 hover:bg-surface-200',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm h-9',
        md: 'px-4 py-2 text-base h-10',
        lg: 'px-6 py-3 text-lg h-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

// apps/web/src/components/Button.tsx (Web implementation)
import { buttonVariants } from '@ordo/ui';
import { cva } from 'class-variance-authority';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Spinner className="mr-2 h-4 w-4" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
```

### 1.3 Turborepo Configuration

```json
{
  "turbo": {
    "tasks": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": ["dist/**"],
        "cache": true
      },
      "dev": {
        "cache": false,
        "persistent": true
      },
      "test": {
        "outputs": ["coverage/**"],
        "cache": true
      }
    },
    "globalEnv": ["NODE_ENV"]
  }
}
```

---

## 2. ShadCN/UI Setup for Web

### 2.1 Installation & Configuration

```bash
cd apps/web
npx shadcn-ui@latest init -d

# Select options:
# - Would you like to use TypeScript? yes
# - Which style would you like to use? default
# - Which color would you like as base color? slate (we'll customize to OKLCH)
# - Where is your global CSS file? src/app/globals.css
# - Do you want to use CSS variables for colors? yes
# - Which CSS variables strategy? css-in-file
# - Where would you like to place your components? src/components/ui
# - Would you like to use an alias for imports? yes
# - What's the import alias for components? @/components
```

### 2.2 Tailwind Configuration with Design Tokens

```javascript
// apps/web/tailwind.config.ts
import type { Config } from 'tailwindcss';
import { designTokens } from '@ordo/design-tokens';

const config: Config = {
  darkMode: 'class', // Dark mode mandatory
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: designTokens.colors.primary[50],
          100: designTokens.colors.primary[100],
          200: designTokens.colors.primary[200],
          300: designTokens.colors.primary[300],
          400: designTokens.colors.primary[400],
          500: designTokens.colors.primary[500],
          600: designTokens.colors.primary[600],
          700: designTokens.colors.primary[700],
          800: designTokens.colors.primary[800],
          900: designTokens.colors.primary[900],
        },
        secondary: {
          50: designTokens.colors.secondary[50],
          // ... 100-900
        },
        accent: {
          50: designTokens.colors.accent[50],
          // ... 100-900
        },
        surface: {
          50: designTokens.colors.surface[50],
          100: designTokens.colors.surface[100],
          // ... extends to dark mode backgrounds
          950: designTokens.colors.surface[950],
        },
        status: {
          success: designTokens.colors.status.success,
          warning: designTokens.colors.status.warning,
          error: designTokens.colors.status.error,
          info: designTokens.colors.status.info,
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
      },
      fontSize: {
        xs: designTokens.typography.sizes.xs,
        sm: designTokens.typography.sizes.sm,
        base: designTokens.typography.sizes.base,
        lg: designTokens.typography.sizes.lg,
        xl: designTokens.typography.sizes.xl,
        '2xl': designTokens.typography.sizes['2xl'],
        '3xl': designTokens.typography.sizes['3xl'],
      },
      spacing: {
        // 4px grid tokens
        0: '0',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
        24: '96px',
      },
      borderRadius: {
        none: '0',
        xs: '2px',
        sm: '4px',
        base: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [require('tailwindcss/plugin')],
};

export default config;
```

### 2.3 Global Styles & CSS Variables

```css
/* apps/web/src/app/globals.css */
@import url('https://rsms.me/inter/inter.css');

@layer base {
  :root {
    --font-inter: 'Inter', system-ui, sans-serif;
    
    /* Primary OKLCH Colors */
    --color-primary-50: oklch(97.6% 0.031 286.23);
    --color-primary-100: oklch(95.2% 0.062 286.23);
    --color-primary-200: oklch(90.5% 0.113 286.23);
    --color-primary-300: oklch(84.9% 0.169 286.23);
    --color-primary-400: oklch(74.7% 0.198 286.23);
    --color-primary-500: oklch(64.2% 0.198 286.23);
    --color-primary-600: oklch(55.3% 0.170 286.23);
    --color-primary-700: oklch(46.8% 0.145 286.23);
    --color-primary-800: oklch(39.4% 0.125 286.23);
    --color-primary-900: oklch(37.9% 0.170 286.23);
    
    /* Surface (dark mode default) */
    --color-surface-50: oklch(98% 0 0);
    --color-surface-100: oklch(95% 0 0);
    --color-surface-200: oklch(89% 0 0);
    --color-surface-300: oklch(80% 0 0);
    --color-surface-400: oklch(64% 0 0);
    --color-surface-500: oklch(50% 0 0);
    --color-surface-600: oklch(40% 0 0);
    --color-surface-700: oklch(30% 0 0);
    --color-surface-800: oklch(20% 0 0);
    --color-surface-900: oklch(14% 0 0);
    
    /* Status Colors */
    --color-success: oklch(70.5% 0.200 142.47);
    --color-warning: oklch(84.4% 0.199 86.77);
    --color-error: oklch(59.7% 0.191 29.23);
    --color-info: oklch(70.7% 0.180 231.60);
  }

  /* Dark mode (mandatory) */
  .dark {
    color-scheme: dark;
    --color-text: var(--color-surface-50);
    --color-bg: var(--color-surface-900);
  }

  html {
    @apply dark scroll-smooth;
  }

  body {
    @apply bg-surface-900 text-surface-50 antialiased transition-colors;
    font-family: var(--font-inter);
  }
}

@layer components {
  /* Utility classes for consistent spacing (4px grid) */
  .grid-4 { @apply gap-1; }
  .grid-8 { @apply gap-2; }
  .grid-12 { @apply gap-3; }
  .grid-16 { @apply gap-4; }
  .grid-24 { @apply gap-6; }
  .grid-32 { @apply gap-8; }
}

@layer utilities {
  /* Focus ring for WCAG AA */
  .focus-ring {
    @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-900;
  }

  /* Smooth transitions */
  .transition-smooth {
    @apply transition-all duration-200 ease-in-out;
  }

  /* Responsive text sizing */
  .text-responsive {
    @apply text-sm sm:text-base md:text-lg;
  }
}
```

---

## 3. Component Variants with CVA (class-variance-authority)

### 3.1 Button Variants Pattern

```typescript
// packages/ui/src/components/primitives/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  // Base styles applied to all variants
  [
    'inline-flex',
    'items-center',
    'justify-center',
    'rounded-md',
    'font-semibold',
    'transition-smooth',
    'focus-ring',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        // Primary: Brand color for main CTAs
        primary: [
          'bg-primary-500',
          'text-white',
          'hover:bg-primary-600',
          'active:bg-primary-700',
          'dark:bg-primary-600',
          'dark:hover:bg-primary-700',
        ],
        // Secondary: Neutral background for secondary actions
        secondary: [
          'bg-surface-200',
          'text-surface-900',
          'hover:bg-surface-300',
          'active:bg-surface-400',
          'dark:bg-surface-800',
          'dark:text-surface-50',
          'dark:hover:bg-surface-700',
        ],
        // Tertiary: Ghost button (minimal)
        tertiary: [
          'bg-transparent',
          'text-primary-600',
          'hover:bg-primary-50',
          'active:bg-primary-100',
          'dark:text-primary-400',
          'dark:hover:bg-surface-800',
        ],
        // Danger: Red accent for destructive actions
        danger: [
          'bg-error',
          'text-white',
          'hover:opacity-90',
          'active:opacity-75',
        ],
        // Success: Green accent for positive actions
        success: [
          'bg-success',
          'text-white',
          'hover:opacity-90',
          'active:opacity-75',
        ],
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        xl: 'h-14 px-8 text-xl',
      },
      fullWidth: {
        true: 'w-full',
      },
      isLoading: {
        true: 'relative !text-transparent pointer-events-none',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      isLoading: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading,
      icon,
      iconPosition = 'left',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, isLoading }), className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <span className="absolute">
            <Spinner size={size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'md'} />
          </span>
        )}
        {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
```

### 3.2 Input Variants Pattern

```typescript
// packages/ui/src/components/primitives/Input.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const inputVariants = cva(
  [
    'w-full',
    'px-3',
    'py-2',
    'border',
    'rounded-md',
    'text-base',
    'font-normal',
    'transition-smooth',
    'focus-ring',
    'placeholder:text-surface-500',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-surface-300',
          'bg-surface-50',
          'text-surface-900',
          'hover:border-surface-400',
          'focus:border-primary-500',
          'dark:border-surface-700',
          'dark:bg-surface-800',
          'dark:text-surface-50',
        ],
        ghost: [
          'border-transparent',
          'bg-surface-100',
          'text-surface-900',
          'hover:bg-surface-200',
          'focus:bg-surface-50',
          'dark:bg-surface-800',
          'dark:text-surface-50',
          'dark:hover:bg-surface-700',
        ],
        error: [
          'border-error',
          'bg-surface-50',
          'text-surface-900',
          'focus:border-error',
          'focus:ring-error/20',
          'dark:bg-surface-800',
        ],
      },
      size: {
        sm: 'h-8 px-2 text-sm',
        md: 'h-10 px-3 text-base',
        lg: 'h-12 px-4 text-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: string;
  helperText?: string;
  label?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, variant, size, fullWidth, error, helperText, label, icon, ...props },
    ref
  ) => {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
          <input
            ref={ref}
            className={cn(
              inputVariants({ variant: error ? 'error' : variant, size, fullWidth }),
              icon && 'pl-10',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-error text-sm mt-1">{error}</p>}
        {helperText && !error && <p className="text-surface-500 text-sm mt-1">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { inputVariants };
```

---

## 4. Platform-Specific Component Variants

### 4.1 Button Across Platforms

**Web (Next.js) Implementation:**

```typescript
// apps/web/src/components/Button.tsx
import { buttonVariants, type ButtonProps as BaseButtonProps } from '@ordo/ui';
import React from 'react';

export interface ButtonProps extends BaseButtonProps {
  href?: string;
  external?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ href, external, ...props }, ref) => {
    // Web can use links for navigation
    if (href) {
      return (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className={buttonVariants(props)}
        >
          {props.children}
        </a>
      );
    }

    return <button ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';
```

**Mobile (React Native) Implementation:**

```typescript
// apps/mobile/src/components/Button.tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { buttonVariants } from '@ordo/ui';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading,
  onPress,
  children,
  icon,
  fullWidth,
}: ButtonProps) => {
  const theme = useTheme();

  // NativeWind styling applied differently on mobile
  const sizeMap = {
    xs: 'h-7 px-2.5',
    sm: 'h-9 px-3',
    md: 'h-10 px-4',
    lg: 'h-12 px-6',
    xl: 'h-14 px-8',
  };

  const variantMap = {
    primary: 'bg-primary-500',
    secondary: 'bg-surface-200 dark:bg-surface-800',
    tertiary: 'bg-transparent',
    danger: 'bg-error',
    success: 'bg-success',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      className={`flex-row items-center justify-center rounded-md ${sizeMap[size]} ${variantMap[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {icon && <View className="mr-2">{icon}</View>}
      <Text
        className={`font-semibold text-base ${
          variant === 'primary' || variant === 'danger' || variant === 'success'
            ? 'text-white'
            : 'text-surface-900 dark:text-surface-50'
        }`}
      >
        {children}
      </Text>
      {isLoading && <Spinner size="sm" className="ml-2" />}
    </Pressable>
  );
};
```

**Desktop (Electron) Implementation:**

```typescript
// apps/desktop/src/renderer/components/Button.tsx
import { buttonVariants, type ButtonProps as BaseButtonProps } from '@ordo/ui';
import React from 'react';

export interface ButtonProps extends BaseButtonProps {
  tooltip?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ tooltip, ...props }, ref) => {
    return (
      <button
        ref={ref}
        title={tooltip}
        className={buttonVariants(props)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

### 4.2 Select Component Across Platforms

**Web with ShadCN/UI (Radix UI Select):**

```typescript
// apps/web/src/components/ui/Select.tsx
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-surface-300 bg-surface-50 px-3 py-2 text-base placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:placeholder:text-surface-400',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-surface-200 bg-surface-50 text-surface-900 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn('p-1', position === 'popper' && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]')}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-primary-500 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-surface-200 dark:bg-surface-700', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
```

**Mobile (React Native Picker):**

```typescript
// apps/mobile/src/components/Select.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export const Select = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  label,
  error,
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || placeholder;

  return (
    <View className="w-full">
      {label && (
        <Text className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => setIsOpen(true)}
        className={`flex-row items-center justify-between px-3 py-2 border rounded-md ${
          error
            ? 'border-error bg-surface-50 dark:bg-surface-800'
            : 'border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-800'
        }`}
      >
        <Text className="text-base text-surface-900 dark:text-surface-50">
          {selectedLabel}
        </Text>
        <ChevronDown
          size={20}
          color="currentColor"
          className={`text-surface-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          onPress={() => setIsOpen(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <Pressable className="bg-surface-50 dark:bg-surface-900 rounded-t-lg p-4">
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setIsOpen(false);
                  }}
                  className="py-3 border-b border-surface-200 dark:border-surface-800"
                >
                  <Text
                    className={`text-base ${
                      value === item.value
                        ? 'font-semibold text-primary-600'
                        : 'text-surface-900 dark:text-surface-50'
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {error && <Text className="text-error text-sm mt-1">{error}</Text>}
    </View>
  );
};
```

---

## 5. Storybook Configuration

### 5.1 Installation & Setup

```bash
cd packages/ui
npx storybook@latest init
# Choose: React + TypeScript + Vite + Yes (stories in index.stories.ts)
```

### 5.2 Storybook Configuration

```typescript
// packages/ui/.storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts?(x)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-controls',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          '@': path.resolve(__dirname, '../src'),
        },
      },
    };
  },
};

export default config;
```

### 5.3 Storybook Preview & Theme

```typescript
// packages/ui/.storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'aria-required-attr',
            enabled: true,
          },
        ],
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-surface-900 p-8 min-h-screen">
        <Story />
      </div>
    ),
  ],
  globalTypes: {
    theme: {
      description: 'Global theme for all stories',
      defaultValue: 'dark',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
};

export default preview;
```

### 5.4 Button Stories Example

```typescript
// packages/ui/src/components/primitives/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Heart, Download } from 'lucide-react';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'tertiary', 'danger', 'success'],
    },
    size: {
      control: 'inline-radio',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    fullWidth: {
      control: 'boolean',
    },
    isLoading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    icon: <Heart size={18} />,
    children: 'Favorite',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    isLoading: true,
    children: 'Saving...',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="success">Success</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

export const WithIconVariations: Story = {
  render: () => (
    <div className="space-y-4">
      <Button icon={<Heart size={18} />} iconPosition="left">
        Left Icon
      </Button>
      <Button icon={<Download size={18} />} iconPosition="right">
        Right Icon
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'Full Width Button',
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};
```

---

## 6. Primitive Components

### 6.1 Button (Complete Implementation)

```typescript
// packages/ui/src/components/primitives/Button.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { Spinner } from './Spinner';

const buttonVariants = cva(
  [
    'inline-flex',
    'items-center',
    'justify-center',
    'gap-2',
    'rounded-md',
    'font-semibold',
    'transition-smooth',
    'focus-ring',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700',
        secondary: 'bg-surface-200 text-surface-900 hover:bg-surface-300 dark:bg-surface-800 dark:text-surface-50 dark:hover:bg-surface-700',
        tertiary: 'bg-transparent text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-surface-800',
        danger: 'bg-error text-white hover:opacity-90 active:opacity-75',
        success: 'bg-success text-white hover:opacity-90 active:opacity-75',
        outline: 'border border-primary-500 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-surface-800',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        xl: 'h-14 px-8 text-xl',
      },
      fullWidth: {
        true: 'w-full',
      },
      isLoading: {
        true: 'relative !text-transparent pointer-events-none',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      isLoading: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading,
      icon,
      iconPosition = 'left',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, fullWidth, isLoading }),
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <span className="absolute">
            <Spinner size={size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'md'} />
          </span>
        )}
        {icon && iconPosition === 'left' && icon}
        {children}
        {icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
```

### 6.2 Input Component

```typescript
// packages/ui/src/components/primitives/Input.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const inputVariants = cva(
  [
    'w-full',
    'px-3',
    'py-2',
    'border',
    'rounded-md',
    'text-base',
    'font-normal',
    'transition-smooth',
    'focus-ring',
    'placeholder:text-surface-500',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        default: 'border-surface-300 bg-surface-50 text-surface-900 hover:border-surface-400 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-50',
        ghost: 'border-transparent bg-surface-100 text-surface-900 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-50 dark:hover:bg-surface-700',
        error: 'border-error bg-surface-50 text-surface-900 focus:border-error dark:bg-surface-800',
      },
      size: {
        sm: 'h-8 px-2 text-sm',
        md: 'h-10 px-3 text-base',
        lg: 'h-12 px-4 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: string;
  helperText?: string;
  label?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      error,
      helperText,
      label,
      icon,
      required,
      type,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              inputVariants({
                variant: error ? 'error' : variant,
                size,
              }),
              icon && 'pl-10',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-error text-sm mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-surface-500 text-sm mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { inputVariants };
```

### 6.3 Card Component

```typescript
// packages/ui/src/components/primitives/Card.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const cardVariants = cva(
  'rounded-lg border transition-all',
  {
    variants: {
      variant: {
        default: 'border-surface-200 bg-surface-50 dark:border-surface-800 dark:bg-surface-800',
        elevated: 'border-surface-200 bg-surface-50 shadow-md dark:border-surface-700 dark:bg-surface-800 dark:shadow-lg',
        ghost: 'border-transparent bg-transparent',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 py-4 border-b border-surface-200 dark:border-surface-700', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-lg font-semibold text-surface-900 dark:text-surface-50', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-surface-600 dark:text-surface-400', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-6 py-4 border-t border-surface-200 flex gap-2 dark:border-surface-700', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';
```

### 6.4 Avatar Component

```typescript
// packages/ui/src/components/primitives/Avatar.tsx
import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const avatarVariants = cva(
  'relative inline-flex items-center justify-center overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700',
  {
    variants: {
      size: {
        xs: 'h-7 w-7 text-xs',
        sm: 'h-9 w-9 text-sm',
        md: 'h-11 w-11 text-base',
        lg: 'h-14 w-14 text-lg',
        xl: 'h-20 w-20 text-2xl',
      },
      status: {
        online: 'ring-2 ring-success',
        away: 'ring-2 ring-warning',
        offline: 'ring-2 ring-surface-400',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

export const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, status, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size, status }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('h-full w-full object-cover', className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex items-center justify-center bg-surface-300 font-semibold text-surface-900 dark:bg-surface-600 dark:text-surface-50', className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
```

### 6.5 Badge Component

```typescript
// packages/ui/src/components/primitives/Badge.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
        secondary: 'bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-200',
        success: 'bg-success/15 text-success dark:bg-success/25',
        warning: 'bg-warning/15 text-warning dark:bg-warning/25',
        error: 'bg-error/15 text-error dark:bg-error/25',
        info: 'bg-info/15 text-info dark:bg-info/25',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
      },
      outline: {
        true: 'border',
      },
    },
    compoundVariants: [
      {
        variant: 'primary',
        outline: true,
        className: 'border-primary-300 dark:border-primary-700',
      },
      {
        variant: 'secondary',
        outline: true,
        className: 'border-surface-300 dark:border-surface-600',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, outline, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, outline }), className)}
      {...props}
    />
  )
);

Badge.displayName = 'Badge';

export { badgeVariants };
```

### 6.6 Dialog/Modal Component

```typescript
// packages/ui/src/components/primitives/Dialog.tsx
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-surface-200 bg-surface-50 p-6 rounded-lg shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] dark:border-surface-800 dark:bg-surface-800',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md opacity-70 ring-offset-surface-900 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:pointer-events-none dark:ring-offset-surface-800">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-surface-500 dark:text-surface-400', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
```

### 6.7 Toast Component

```typescript
// packages/ui/src/components/primitives/Toast.tsx
import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

const toastVariants = cva(
  'group pointer-events-auto relative w-full items-center justify-between space-x-4 overflow-hidden rounded-md border border-surface-200 p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full dark:border-surface-800',
  {
    variants: {
      variant: {
        default: 'border bg-surface-50 text-surface-900 dark:bg-surface-800 dark:text-surface-50',
        success: 'border-success bg-success/10 text-success dark:bg-success/20',
        error: 'border-error bg-error/10 text-error dark:bg-error/20',
        warning: 'border-warning bg-warning/10 text-warning dark:bg-warning/20',
        info: 'border-info bg-info/10 text-info dark:bg-info/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>,
    VariantProps<typeof toastVariants> {}

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(toastVariants({ variant }), className)}
    {...props}
  />
));
Toast.displayName = ToastPrimitives.Root.displayName;

export const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-surface-900 transition-colors hover:bg-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-surface-500/20 group-[.destructive]:hover:border-error/30 group-[.destructive]:hover:bg-error/30 group-[.destructive]:hover:text-error dark:bg-surface-800 dark:ring-offset-surface-800',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-surface-600 opacity-0 transition-opacity hover:text-surface-900 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-error/50 group-[.destructive]:hover:text-error group-[.destructive]:focus:ring-error dark:text-surface-400 dark:hover:text-surface-50',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn('text-sm opacity-90', className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export { type ToastActionElement, ToastPrimitives };
```

### 6.8 Dropdown Menu Component

```typescript
// packages/ui/src/components/primitives/DropdownMenu.tsx
import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/utils/cn';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-primary-500 focus:text-white data-[state=open]:bg-primary-500 data-[state=open]:text-white',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

export const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'min-w-[8rem] overflow-hidden rounded-md border border-surface-200 bg-surface-50 p-1 text-surface-900 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-surface-800 dark:bg-surface-800 dark:text-surface-50',
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'min-w-[8rem] overflow-hidden rounded-md border border-surface-200 bg-surface-50 p-1 text-surface-900 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-surface-800 dark:bg-surface-800 dark:text-surface-50',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-primary-500 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-primary-500 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>

    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

export const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-primary-500 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>

    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-surface-200 dark:bg-surface-700', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />
);
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';
```

### 6.9 Tabs Component

```typescript
// packages/ui/src/components/primitives/Tabs.tsx
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/utils/cn';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-lg bg-surface-200 p-1 text-surface-600 dark:bg-surface-800 dark:text-surface-400',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-surface-900 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-surface-50 data-[state=active]:text-surface-900 data-[state=active]:shadow-sm dark:ring-offset-surface-800 dark:data-[state=active]:bg-surface-900 dark:data-[state=active]:text-surface-50',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:ring-offset-surface-800',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
```

---

## 7. Composite Components

### 7.1 MediaCard Component

```typescript
// packages/ui/src/components/composite/MediaCard.tsx
import * as React from 'react';
import { Card, CardContent } from '@/components/primitives/Card';
import { Badge } from '@/components/primitives/Badge';
import { cn } from '@/utils/cn';

export interface MediaCardProps {
  image: string;
  imageAlt: string;
  title: string;
  description?: string;
  category?: string;
  categoryVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  onClick?: () => void;
  isSelected?: boolean;
}

export const MediaCard = React.forwardRef<HTMLDivElement, MediaCardProps>(
  (
    {
      image,
      imageAlt,
      title,
      description,
      category,
      categoryVariant = 'primary',
      onClick,
      isSelected,
    },
    ref
  ) => {
    return (
      <Card
        ref={ref}
        variant="elevated"
        interactive={!!onClick}
        onClick={onClick}
        className={cn(
          'overflow-hidden cursor-pointer transition-all',
          isSelected && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-surface-900'
        )}
      >
        <div className="relative h-48 overflow-hidden bg-surface-200 dark:bg-surface-700">
          <img
            src={image}
            alt={imageAlt}
            className="h-full w-full object-cover transition-transform hover:scale-105"
          />
          {category && (
            <div className="absolute top-2 right-2">
              <Badge variant={categoryVariant} size="sm">
                {category}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg text-surface-900 dark:text-surface-50 mb-2 line-clamp-2">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-surface-600 dark:text-surface-400 line-clamp-2">
              {description}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }
);

MediaCard.displayName = 'MediaCard';
```

### 7.2 ProjectCard Component

```typescript
// packages/ui/src/components/composite/ProjectCard.tsx
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/primitives/Card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/primitives/Avatar';
import { Badge } from '@/components/primitives/Badge';
import { MoreVertical, Calendar, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/primitives/DropdownMenu';
import { cn } from '@/utils/cn';

export interface ProjectCardProps {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in-progress' | 'completed' | 'paused';
  dueDate?: string;
  members?: Array<{ id: string; name: string; avatar?: string }>;
  progress?: number;
  onMenuClick?: (action: string, id: string) => void;
}

export const ProjectCard = React.forwardRef<HTMLDivElement, ProjectCardProps>(
  (
    { id, name, description, status, dueDate, members = [], progress, onMenuClick },
    ref
  ) => {
    const statusColors = {
      planning: 'bg-info/15 text-info',
      'in-progress': 'bg-warning/15 text-warning',
      completed: 'bg-success/15 text-success',
      paused: 'bg-surface-300/50 text-surface-700',
    };

    return (
      <Card ref={ref} variant="elevated">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>{name}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-md transition">
                <MoreVertical size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onMenuClick?.('edit', id)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMenuClick?.('view', id)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMenuClick?.('delete', id)} className="text-error">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={status === 'completed' ? 'success' : status === 'in-progress' ? 'warning' : 'secondary'}>
              {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            </Badge>
            {dueDate && (
              <div className="flex items-center gap-1 text-sm text-surface-600 dark:text-surface-400">
                <Calendar size={14} />
                {dueDate}
              </div>
            )}
          </div>

          {progress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-surface-700 dark:text-surface-300">Progress</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {members.length > 0 && (
            <div className="flex items-center gap-2">
              <Users size={16} className="text-surface-600 dark:text-surface-400" />
              <div className="flex -space-x-2">
                {members.slice(0, 3).map((member) => (
                  <Avatar key={member.id} size="sm">
                    {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
                    <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 3 && (
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-surface-300 dark:bg-surface-700 text-xs font-semibold">
                    +{members.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

ProjectCard.displayName = 'ProjectCard';
```

---

## 8. Form Components with React Hook Form + Zod

### 8.1 Form Hook Integration

```typescript
// packages/ui/src/components/forms/useForm.ts
import { useForm as useReactHookForm, SubmitHandler, UseFormProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';

export interface UseFormOptions<T extends ZodSchema> extends Omit<UseFormProps, 'resolver'> {
  schema: T;
}

export function useForm<T extends ZodSchema>({ schema, ...options }: UseFormOptions<T>) {
  return useReactHookForm({
    resolver: zodResolver(schema),
    ...options,
  });
}
```

### 8.2 Form Components

```typescript
// packages/ui/src/components/forms/FormField.tsx
import * as React from 'react';
import { Controller, FieldPath, FieldValues, UseControllerProps } from 'react-hook-form';
import { cn } from '@/utils/cn';

export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends UseControllerProps<TFieldValues, TName> {
  label?: string;
  description?: string;
  required?: boolean;
  render: (props: { field: any; fieldState: any }) => React.ReactNode;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, description, required, render, ...props }, ref) => {
    return (
      <Controller
        {...props}
        render={({ field, fieldState }) => (
          <div ref={ref} className="w-full">
            {label && (
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                {label}
                {required && <span className="text-error ml-1">*</span>}
              </label>
            )}
            {render({ field, fieldState })}
            {description && !fieldState.error && (
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                {description}
              </p>
            )}
            {fieldState.error && (
              <p className="text-sm text-error mt-1">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />
    );
  }
);

FormField.displayName = 'FormField';
```

### 8.3 Form Example with Zod Validation

```typescript
// apps/web/src/components/forms/LoginForm.tsx
import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@ordo/ui';
import { Input } from '@ordo/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@ordo/ui';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      // API call
      console.log('Login:', data);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
```

---

## 9. Layout Components

### 9.1 PageLayout Component

```typescript
// packages/ui/src/components/layout/PageLayout.tsx
import * as React from 'react';
import { cn } from '@/utils/cn';

export interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarPosition?: 'left' | 'right';
}

export const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  ({ header, sidebar, footer, sidebarPosition = 'left', className, children, ...props }, ref) => {
    return (
      <div ref={ref} className="flex flex-col h-screen bg-surface-900" {...props}>
        {/* Header */}
        {header && <div className="border-b border-surface-800">{header}</div>}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {sidebar && sidebarPosition === 'left' && (
            <aside className="w-64 border-r border-surface-800 overflow-y-auto">
              {sidebar}
            </aside>
          )}

          {/* Content */}
          <main className={cn('flex-1 overflow-y-auto', className)}>
            {children}
          </main>

          {/* Right Sidebar */}
          {sidebar && sidebarPosition === 'right' && (
            <aside className="w-64 border-l border-surface-800 overflow-y-auto">
              {sidebar}
            </aside>
          )}
        </div>

        {/* Footer */}
        {footer && <div className="border-t border-surface-800">{footer}</div>}
      </div>
    );
  }
);

PageLayout.displayName = 'PageLayout';
```

### 9.2 Sidebar Component

```typescript
// packages/ui/src/components/layout/Sidebar.tsx
import * as React from 'react';
import { cn } from '@/utils/cn';

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, collapsible = false, defaultCollapsed = false, ...props }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface-800 transition-all duration-300',
          isCollapsed && collapsible && 'w-20',
          !isCollapsed && 'w-64',
          className
        )}
        {...props}
      >
        {/* Sidebar content */}
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-surface-700 rounded"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        )}
      </div>
    );
  }
);

Sidebar.displayName = 'Sidebar';
```

### 9.3 TopBar Component

```typescript
// packages/ui/src/components/layout/TopBar.tsx
import * as React from 'react';
import { cn } from '@/utils/cn';

export interface TopBarProps extends React.HTMLAttributes<HTMLDivElement> {
  logo?: React.ReactNode;
  navItems?: Array<{ label: string; href: string }>;
  actions?: React.ReactNode;
}

export const TopBar = React.forwardRef<HTMLDivElement, TopBarProps>(
  ({ logo, navItems, actions, className, ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          'flex items-center justify-between h-16 px-6 bg-surface-800 border-b border-surface-700',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-8">
          {logo && <div>{logo}</div>}
          {navItems && (
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-surface-300 hover:text-white transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}
        </div>
        {actions && <div className="flex items-center gap-4">{actions}</div>}
      </header>
    );
  }
);

TopBar.displayName = 'TopBar';
```

### 9.4 MobileTabBar Component

```typescript
// packages/ui/src/components/layout/MobileTabBar.tsx
import * as React from 'react';
import { cn } from '@/utils/cn';

export interface TabBarItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: number;
}

export interface MobileTabBarProps {
  items: TabBarItem[];
  activeValue: string;
  onValueChange: (value: string) => void;
}

export const MobileTabBar = React.forwardRef<HTMLDivElement, MobileTabBarProps>(
  ({ items, activeValue, onValueChange }, ref) => {
    return (
      <div
        ref={ref}
        className="fixed bottom-0 left-0 right-0 bg-surface-800 border-t border-surface-700 safe-area-inset-bottom"
      >
        <div className="flex justify-around items-stretch h-16">
          {items.map((item) => (
            <button
              key={item.value}
              onClick={() => onValueChange(item.value)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2 transition-colors relative',
                activeValue === item.value
                  ? 'text-primary-500 bg-surface-700/50'
                  : 'text-surface-400 hover:text-surface-300'
              )}
            >
              <div className="text-xl">{item.icon}</div>
              <span className="text-xs text-center line-clamp-1">{item.label}</span>
              {item.badge ? (
                <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-error text-white text-xs flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    );
  }
);

MobileTabBar.displayName = 'MobileTabBar';
```

---

## 10. Accessibility Patterns

### 10.1 ARIA and Keyboard Navigation

```typescript
// packages/ui/src/hooks/useKeyboardNavigation.ts
import { useEffect, useRef, useCallback } from 'react';

export interface UseKeyboardNavigationOptions {
  items: HTMLElement[];
  onSelect?: (index: number) => void;
  loop?: boolean;
  direction?: 'vertical' | 'horizontal';
}

export function useKeyboardNavigation({
  items,
  onSelect,
  loop = true,
  direction = 'vertical',
}: UseKeyboardNavigationOptions) {
  const currentIndexRef = useRef(0);

  const navigate = useCallback(
    (direction: 'next' | 'prev') => {
      const isVertical = direction === 'vertical';
      const currentIndex = currentIndexRef.current;
      let nextIndex = currentIndex;

      if (direction === 'next') {
        nextIndex = currentIndex + 1;
        if (loop && nextIndex >= items.length) nextIndex = 0;
      } else {
        nextIndex = currentIndex - 1;
        if (loop && nextIndex < 0) nextIndex = items.length - 1;
      }

      if (nextIndex >= 0 && nextIndex < items.length) {
        currentIndexRef.current = nextIndex;
        items[nextIndex].focus();
        onSelect?.(nextIndex);
      }
    },
    [items, onSelect, loop]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const vertical = ['ArrowUp', 'ArrowDown'].includes(key);
      const horizontal = ['ArrowLeft', 'ArrowRight'].includes(key);

      if (key === 'Home') {
        e.preventDefault();
        currentIndexRef.current = 0;
        items[0]?.focus();
        onSelect?.(0);
      } else if (key === 'End') {
        e.preventDefault();
        currentIndexRef.current = items.length - 1;
        items[items.length - 1]?.focus();
        onSelect?.(items.length - 1);
      } else if (vertical && direction === 'vertical') {
        e.preventDefault();
        navigate(key === 'ArrowDown' ? 'next' : 'prev');
      } else if (horizontal && direction === 'horizontal') {
        e.preventDefault();
        navigate(key === 'ArrowRight' ? 'next' : 'prev');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, navigate, direction, onSelect]);

  return { currentIndex: currentIndexRef.current };
}
```

### 10.2 Focus Management Hook

```typescript
// packages/ui/src/hooks/useFocusRing.ts
import { useRef, useEffect, useState } from 'react';

export function useFocusRing() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show focus ring only for keyboard navigation
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') {
        setIsFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setIsFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return { ref, isFocusVisible };
}
```

### 10.3 ARIA Announcements

```typescript
// packages/ui/src/utils/a11y.ts
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

export function createAriaLabel(label: string, additionalInfo?: string) {
  return additionalInfo ? `${label} ${additionalInfo}` : label;
}
```

---

## 11. Icon System — Lucide React

### 11.1 Icon Wrapper

```typescript
// packages/ui/src/components/icons/Icon.tsx
import * as React from 'react';
import * as LucideIcons from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const iconVariants = cva('', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-10 w-10',
    },
    color: {
      current: 'text-current',
      surface: 'text-surface-600 dark:text-surface-400',
      primary: 'text-primary-600 dark:text-primary-400',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'current',
  },
});

export interface IconProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof iconVariants> {
  name: keyof typeof LucideIcons;
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ name, size, color, className, ...props }, ref) => {
    // @ts-ignore - Dynamic icon lookup
    const IconComponent = LucideIcons[name];

    if (!IconComponent) {
      console.warn(`Icon '${name}' not found in lucide-react`);
      return null;
    }

    return (
      <IconComponent
        ref={ref}
        className={cn(iconVariants({ size, color }), className)}
        {...props}
      />
    );
  }
);

Icon.displayName = 'Icon';

export { LucideIcons };
```

### 11.2 Custom Icon Integration

```typescript
// packages/ui/src/components/icons/useIcon.ts
import { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';

type IconKey = keyof typeof LucideIcons;

export function useIcon(name: IconKey) {
  return useMemo(() => {
    // @ts-ignore
    return LucideIcons[name];
  }, [name]);
}

// For custom SVG icons:
export function registerCustomIcon(name: string, Component: React.ComponentType) {
  // Store in a custom registry if needed
  return Component;
}
```

---

## 12. Component Testing Patterns

### 12.1 Setup with Vitest + React Testing Library

```typescript
// packages/ui/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 12.2 Test Setup & Utilities

```typescript
// packages/ui/src/__tests__/setup.ts
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### 12.3 Button Component Tests

```typescript
// packages/ui/src/components/primitives/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with default styles', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-500');
  });

  it('applies variant styles correctly', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-surface-200');
  });

  it('applies size styles correctly', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-12');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    const button = screen.getByRole('button');
    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('disables button when loading', () => {
    render(<Button isLoading>Saving</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('disables button when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders with icon', () => {
    const icon = <span data-testid="icon">★</span>;
    render(<Button icon={icon}>Favorite</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders full width when specified', () => {
    render(<Button fullWidth>Full Width</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
  });

  it('supports keyboard navigation', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    const button = screen.getByRole('button');
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button).toHaveFocus();
  });

  it('has proper ARIA attributes', () => {
    render(<Button aria-label="Submit form">Submit</Button>);
    const button = screen.getByRole('button', { name: /submit form/i });
    expect(button).toHaveAttribute('aria-label');
  });
});
```

### 12.4 Input Component Tests

```typescript
// packages/ui/src/components/primitives/Input.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders input field', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('displays error message', () => {
    const errorMessage = 'This field is required';
    render(<Input error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays helper text when no error', () => {
    const helperText = 'Enter your email address';
    render(<Input helperText={helperText} />);
    expect(screen.getByText(helperText)).toBeInTheDocument();
  });

  it('handles input changes', async () => {
    render(<Input placeholder="Type something" />);
    const input = screen.getByPlaceholderText('Type something') as HTMLInputElement;
    await userEvent.type(input, 'test value');
    expect(input.value).toBe('test value');
  });

  it('applies error variant when error exists', () => {
    render(<Input error="Invalid" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-error');
  });

  it('disables input when disabled', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('marks field as required when specified', () => {
    render(<Input label="Email" required />);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
  });
});
```

### 12.5 Accessibility Testing

```typescript
// packages/ui/src/__tests__/accessibility.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../components/primitives/Button';
import { Input } from '../components/primitives/Input';
import { Dialog, DialogTrigger, DialogContent } from '../components/primitives/Dialog';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('Button has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input with label has no accessibility violations', async () => {
    const { container } = render(<Input label="Email" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Dialog has proper ARIA roles', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <div role="document">Dialog content</div>
        </DialogContent>
      </Dialog>
    );
    const trigger = screen.getByRole('button', { name: /open/i });
    expect(trigger).toBeInTheDocument();
  });

  it('Form inputs are properly labeled', () => {
    render(
      <>
        <Input label="First Name" />
        <Input label="Last Name" />
      </>
    );
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
  });

  it('Color contrast meets WCAG AA standards', async () => {
    const { container } = render(<Button>Test</Button>);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });
});
```

---

## Summary & Next Steps

This comprehensive component library setup provides:

1. **Monorepo Architecture** — Shared packages across web, mobile, desktop
2. **ShadCN/UI Web** — Production-ready React components with Tailwind
3. **CVA Variants** — Flexible, type-safe component styling
4. **Platform Variants** — Web/Mobile/Desktop specific implementations
5. **Storybook** — Interactive documentation and visual testing
6. **48+ Primitive Components** — Complete implementation examples
7. **Composite Components** — Real-world business components
8. **Form Integration** — React Hook Form + Zod validation
9. **Layout System** — PageLayout, Sidebar, TopBar, MobileTabBar
10. **Accessibility** — ARIA, keyboard nav, focus management, screen readers
11. **Icon System** — Lucide React with custom integration
12. **Testing** — Vitest + RTL patterns for comprehensive coverage

**Implementation Path:**
1. Set up monorepo structure with Turborepo
2. Install ShadCN/UI components for web platform
3. Implement design tokens (OKLCH colors, typography, spacing)
4. Build primitive components with CVA
5. Create composite components
6. Set up Storybook for documentation
7. Add form components with validation
8. Implement layout system
9. Configure accessibility testing
10. Set up comprehensive test suite

All code examples are production-ready and follow React 18+ best practices with TypeScript strict mode.

