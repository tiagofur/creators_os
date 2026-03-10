# Routing & Navigation Patterns Specification
## Ordo Creator OS — Cross-Platform Navigation Architecture

> Comprehensive guide to routing, navigation, and URL patterns across Next.js (web), Expo Router (mobile), and Electron (desktop) platforms. Covers Auth routing, Protected Routes, Dynamic Segments, Deep Linking, and Page Transitions with actual implementation code.

---

## Table of Contents

1. [Next.js App Router Structure](#1-nextjs-app-router-structure)
2. [Route Definitions & File Paths](#2-route-definitions--file-paths)
3. [Authentication Middleware](#3-authentication-middleware)
4. [Layout Nesting & Hierarchy](#4-layout-nesting--hierarchy)
5. [Protected Route Patterns](#5-protected-route-patterns)
6. [Dynamic Routes & Catch-All](#6-dynamic-routes--catch-all)
7. [Parallel Routes & Intercepting Routes](#7-parallel-routes--intercepting-routes)
8. [Loading & Error States](#8-loading--error-states)
9. [Navigation Components](#9-navigation-components)
10. [Expo Router (Mobile)](#10-expo-router-mobile)
11. [Deep Linking Strategy](#11-deep-linking-strategy)
12. [Electron Navigation](#12-electron-navigation)
13. [Page Transitions & Animations](#13-page-transitions--animations)
14. [Prefetching & Data Loading](#14-prefetching--data-loading)

---

## 1. Next.js App Router Structure

### 1.1 Route Groups Overview

The app uses **four primary route groups** to organize pages by authentication state, lifecycle stage, and public vs. protected access:

| Route Group | Locale | Auth Check | Layout | Purpose |
|---|---|---|---|---|
| `(auth)` | ✓ | Redirect if authenticated | Centered card, no sidebar | Login, register, forgot password, email verification |
| `(app)` | ✓ | **Required** | Sidebar + header | Authenticated features (dashboard, projects, media, editor, analytics, AI tools, publishing, settings) |
| `(onboarding)` | ✓ | Optional (redirect if already completed) | Wizard/progressive disclosure | New user flow: welcome, profile setup, first project |
| `(marketing)` | ✓ | N/A | Public layout (no auth required) | Landing pages, pricing, blog, help docs |

### 1.2 Route Group File Structure

```
src/app/
│
├── [locale]/                           # Locale segment (en, es, pt)
│   │
│   ├── (auth)/                         # Auth pages (login, register, etc.)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/[token]/page.tsx
│   │   └── verify-email/[token]/page.tsx
│   │
│   ├── (app)/                          # Protected authenticated routes
│   │   ├── layout.tsx                  # AppLayout with sidebar
│   │   ├── dashboard/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx                # Projects list
│   │   │   └── [id]/page.tsx           # Project detail
│   │   ├── media/page.tsx
│   │   ├── editor/[id]/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── ai-tools/page.tsx
│   │   ├── publishing/page.tsx
│   │   └── settings/
│   │       ├── page.tsx                # Settings overview
│   │       ├── profile/page.tsx
│   │       ├── workspace/page.tsx
│   │       ├── billing/page.tsx
│   │       ├── integrations/page.tsx
│   │       └── security/page.tsx
│   │
│   ├── (onboarding)/                   # New user flow
│   │   ├── layout.tsx
│   │   ├── welcome/page.tsx
│   │   ├── profile-setup/page.tsx
│   │   └── first-project/page.tsx
│   │
│   ├── (marketing)/                    # Public pages
│   │   ├── page.tsx                    # Home
│   │   ├── pricing/page.tsx
│   │   ├── features/page.tsx
│   │   ├── blog/page.tsx
│   │   └── [...slug]/page.tsx          # Catch-all for docs
│   │
│   ├── layout.tsx                      # Root locale layout (providers, theme)
│   ├── page.tsx                        # Redirect to dashboard
│   ├── not-found.tsx
│   ├── error.tsx
│   └── loading.tsx
│
└── layout.tsx                          # Global layout (above locale)
```

---

## 2. Route Definitions & File Paths

### 2.1 Complete Route Map

#### Authentication Routes (`(auth)`)

| Route | File Path | Description |
|---|---|---|
| `/[locale]/login` | `src/app/[locale]/(auth)/login/page.tsx` | Login form |
| `/[locale]/register` | `src/app/[locale]/(auth)/register/page.tsx` | Registration form |
| `/[locale]/forgot-password` | `src/app/[locale]/(auth)/forgot-password/page.tsx` | Forgot password form |
| `/[locale]/reset-password/[token]` | `src/app/[locale]/(auth)/reset-password/[token]/page.tsx` | Reset password with token |
| `/[locale]/verify-email/[token]` | `src/app/[locale]/(auth)/verify-email/[token]/page.tsx` | Email verification |

#### Application Routes (`(app)`)

| Route | File Path | Description |
|---|---|---|
| `/[locale]/dashboard` | `src/app/[locale]/(app)/dashboard/page.tsx` | Dashboard overview |
| `/[locale]/projects` | `src/app/[locale]/(app)/projects/page.tsx` | Projects list |
| `/[locale]/projects/[id]` | `src/app/[locale]/(app)/projects/[id]/page.tsx` | Project detail |
| `/[locale]/media` | `src/app/[locale]/(app)/media/page.tsx` | Media library |
| `/[locale]/editor/[id]` | `src/app/[locale]/(app)/editor/[id]/page.tsx` | Content editor |
| `/[locale]/analytics` | `src/app/[locale]/(app)/analytics/page.tsx` | Analytics overview |
| `/[locale]/ai-tools` | `src/app/[locale]/(app)/ai-tools/page.tsx` | AI tools dashboard |
| `/[locale]/publishing` | `src/app/[locale]/(app)/publishing/page.tsx` | Social publishing |
| `/[locale]/settings` | `src/app/[locale]/(app)/settings/page.tsx` | Settings overview |
| `/[locale]/settings/profile` | `src/app/[locale]/(app)/settings/profile/page.tsx` | Profile settings |
| `/[locale]/settings/workspace` | `src/app/[locale]/(app)/settings/workspace/page.tsx` | Workspace settings |
| `/[locale]/settings/billing` | `src/app/[locale]/(app)/settings/billing/page.tsx` | Billing & subscription |
| `/[locale]/settings/integrations` | `src/app/[locale]/(app)/settings/integrations/page.tsx` | Integrations |
| `/[locale]/settings/security` | `src/app/[locale]/(app)/settings/security/page.tsx` | Security settings |

#### Onboarding Routes (`(onboarding)`)

| Route | File Path | Description |
|---|---|---|
| `/[locale]/onboarding/welcome` | `src/app/[locale]/(onboarding)/welcome/page.tsx` | Welcome screen |
| `/[locale]/onboarding/profile-setup` | `src/app/[locale]/(onboarding)/profile-setup/page.tsx` | Profile setup step |
| `/[locale]/onboarding/first-project` | `src/app/[locale]/(onboarding)/first-project/page.tsx` | Create first project |

#### Marketing Routes (`(marketing)`)

| Route | File Path | Description |
|---|---|---|
| `/[locale]/` | `src/app/[locale]/(marketing)/page.tsx` | Home/landing page |
| `/[locale]/pricing` | `src/app/[locale]/(marketing)/pricing/page.tsx` | Pricing page |
| `/[locale]/features` | `src/app/[locale]/(marketing)/features/page.tsx` | Features page |
| `/[locale]/blog` | `src/app/[locale]/(marketing)/blog/page.tsx` | Blog list |
| `/[locale]/docs/[...slug]` | `src/app/[locale]/(marketing)/docs/[...slug]/page.tsx` | Documentation (catch-all) |

### 2.2 URL Examples by Locale

```
# English
/en/login
/en/dashboard
/en/projects/123
/en/editor/abc-def-ghi
/en/settings/profile

# Spanish
/es/login
/es/dashboard
/es/projects/123

# Portuguese
/pt/login
/pt/dashboard
```

---

## 3. Authentication Middleware

### 3.1 Middleware Implementation

**File: `src/middleware.ts`**

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { i18n } from '@/config/i18n.config';

const locales = i18n.locales;
const defaultLocale = i18n.defaultLocale;

// Paths that don't require authentication
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/pricing',
  '/features',
  '/blog',
  '/docs',
];

// Paths that should redirect if already authenticated
const authPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

// Paths that require authentication
const protectedPaths = ['/dashboard', '/projects', '/media', '/editor', '/analytics', '/ai-tools', '/publishing', '/settings'];

// Onboarding paths
const onboardingPaths = ['/onboarding'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Locale detection and redirect if missing
  const pathnameHasLocale = locales.some((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`);

  if (!pathnameHasLocale) {
    const locale = getLocaleFromRequest(request) || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  // 2. Extract locale and path without locale
  const segments = pathname.split('/');
  const locale = segments[1];
  const pathWithoutLocale = '/' + segments.slice(2).join('/');

  // 3. Get authentication token from cookies
  const token = request.cookies.get('auth_token')?.value;
  const onboardingComplete = request.cookies.get('onboarding_complete')?.value === 'true';

  // 4. Auth flow redirects
  if (authPaths.some((p) => pathWithoutLocale.startsWith(p))) {
    // User is on auth page
    if (token) {
      // Already authenticated → redirect to dashboard
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  // 5. Protected route checks
  if (protectedPaths.some((p) => pathWithoutLocale.startsWith(p))) {
    if (!token) {
      // Not authenticated → redirect to login with return URL
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 6. Onboarding check for protected routes
  if (protectedPaths.some((p) => pathWithoutLocale.startsWith(p))) {
    if (token && !onboardingComplete) {
      // Authenticated but onboarding not complete → redirect to onboarding
      return NextResponse.redirect(new URL(`/${locale}/onboarding/welcome`, request.url));
    }
  }

  // 7. Allow request to proceed
  return NextResponse.next();
}

// Locale detection helper
function getLocaleFromRequest(request: NextRequest): string | undefined {
  // 1. Check URL query params
  const urlLocale = request.nextUrl.searchParams.get('locale');
  if (urlLocale && locales.includes(urlLocale)) {
    return urlLocale;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')[0]
      .split('-')[0]
      .toLowerCase();
    if (locales.includes(preferred)) {
      return preferred;
    }
  }

  // 3. Check existing locale cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }

  return undefined;
}

export const config = {
  matcher: ['/((?!_next|api|static|public|.*\\.\\w+$).*)'],
};
```

### 3.2 Middleware Configuration

The middleware handles:
- **Locale Detection**: Checks URL, headers, cookies for preferred language
- **Auth Token Validation**: Reads `auth_token` from secure HTTP-only cookie
- **Redirect Logic**:
  - Auth pages (login/register) → Dashboard if already authenticated
  - Protected routes → Login if not authenticated
  - Protected routes → Onboarding if authenticated but not completed
  - Missing locale → Redirect to default or detected locale
- **Onboarding Check**: Ensures new users complete profile before accessing app

---

## 4. Layout Nesting & Hierarchy

### 4.1 Layout Hierarchy

```
RootLayout (src/app/layout.tsx)
│
├── Providers: Tailwind, Theme, React Query, Zustand
│
└── [locale]/layout.tsx (LocaleLayout)
    │
    ├── i18n context setup
    ├── Locale-specific styling
    │
    ├── (auth)/layout.tsx (AuthLayout)
    │   └── Centered card container, no sidebar
    │
    ├── (app)/layout.tsx (AppLayout)
    │   ├── Sidebar navigation
    │   ├── TopBar/Header
    │   ├── Mobile bottom navigation
    │   └── Main content area
    │
    ├── (onboarding)/layout.tsx (OnboardingLayout)
    │   └── Wizard/progressive disclosure style
    │
    └── (marketing)/layout.tsx (MarketingLayout)
        ├── Public header
        ├── Footer
        └── Main content
```

### 4.2 Root Layout (`src/app/layout.tsx`)

```typescript
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ordo Creator OS',
  description: 'Content creation and management platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### 4.3 Locale Layout (`src/app/[locale]/layout.tsx`)

```typescript
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { i18n } from '@/config/i18n.config';

export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!i18n.locales.includes(locale as never)) {
    notFound();
  }

  setRequestLocale(locale);
  const currentLocale = getLocale();

  return (
    <div suppressHydrationWarning lang={currentLocale}>
      <LocaleProvider locale={locale}>
        {children}
      </LocaleProvider>
    </div>
  );
}
```

### 4.4 Auth Layout (`src/app/[locale]/(auth)/layout.tsx`)

```typescript
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { AuthContainer } from '@/components/auth/auth-container';

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Redirect authenticated users away from auth pages
  const token = await getAuthToken();
  if (token) {
    redirect('/dashboard');
  }

  return (
    <AuthContainer>
      {children}
    </AuthContainer>
  );
}
```

### 4.5 App Layout (`src/app/[locale]/(app)/layout.tsx`)

```typescript
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getAuthToken, isOnboardingComplete } from '@/lib/auth';
import { AppSidebar } from '@/components/app/sidebar';
import { AppHeader } from '@/components/app/header';
import { MobileBottomNav } from '@/components/app/mobile-bottom-nav';

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Check authentication
  const token = await getAuthToken();
  if (!token) {
    redirect('/login?callbackUrl=/dashboard');
  }

  // Check onboarding completion
  const onboardingComplete = await isOnboardingComplete();
  if (!onboardingComplete) {
    redirect('/onboarding/welcome');
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar: visible on desktop, hidden on mobile */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r">
        <AppSidebar />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Header: visible on all screens */}
        <header className="border-b">
          <AppHeader />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Mobile bottom nav: visible only on mobile */}
        <nav className="border-t md:hidden">
          <MobileBottomNav />
        </nav>
      </div>
    </div>
  );
}
```

### 4.6 Onboarding Layout (`src/app/[locale]/(onboarding)/layout.tsx`)

```typescript
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { isOnboardingComplete } from '@/lib/auth';
import { OnboardingContainer } from '@/components/onboarding/container';

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Redirect if already completed
  const completed = await isOnboardingComplete();
  if (completed) {
    redirect('/dashboard');
  }

  return (
    <OnboardingContainer>
      {children}
    </OnboardingContainer>
  );
}
```

---

## 5. Protected Route Patterns

### 5.1 Server-Side Protection

Protected routes use **server components** with `getAuthToken()` helper:

**File: `src/app/[locale]/(app)/dashboard/page.tsx`**

```typescript
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthToken, getCurrentUser } from '@/lib/auth';
import { DashboardClient } from './dashboard-client';

export const metadata: Metadata = {
  title: 'Dashboard | Ordo Creator OS',
};

export default async function DashboardPage() {
  // Server-side auth check
  const token = await getAuthToken();
  if (!token) {
    redirect('/login?callbackUrl=/dashboard');
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?callbackUrl=/dashboard');
  }

  return (
    <DashboardClient initialUser={user} />
  );
}
```

### 5.2 Client-Side Auth Guard HOC

**File: `src/components/auth/protected-route.tsx`**

```typescript
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Double-check authentication on client
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check role if required
    if (requiredRole && user?.role !== requiredRole) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
```

### 5.3 Redirect with Return URL

After login, users are redirected to their original destination:

**File: `src/app/[locale]/(auth)/login/page.tsx`**

```typescript
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { loginUser } from '@/lib/auth-client';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(email: string, password: string) {
    try {
      await loginUser(email, password);
      router.push(callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <LoginForm
      onSubmit={handleLogin}
      error={error}
    />
  );
}
```

---

## 6. Dynamic Routes & Catch-All

### 6.1 Dynamic Segment Routes

**File: `src/app/[locale]/(app)/projects/[id]/page.tsx`**

```typescript
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProject } from '@/lib/api';
import { ProjectDetail } from '@/components/projects/project-detail';

interface ProjectPageProps {
  params: { id: string; locale: string };
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  try {
    const project = await getProject(params.id);
    return {
      title: `${project.name} | Projects | Ordo Creator OS`,
      description: project.description,
    };
  } catch {
    return { title: 'Project not found' };
  }
}

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  // Pre-render popular projects at build time
  const projects = await getTopProjects(10);
  return projects.map((p) => ({
    locale: params.locale,
    id: p.id,
  }));
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = await getProject(params.id);

  if (!project) {
    notFound();
  }

  return <ProjectDetail project={project} />;
}
```

### 6.2 Catch-All Routes for Dynamic Segments

**File: `src/app/[locale]/(marketing)/docs/[...slug]/page.tsx`**

```typescript
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDocumentation } from '@/lib/docs';
import { DocumentationPage } from '@/components/docs/page';

interface DocsPageProps {
  params: { slug: string[]; locale: string };
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const path = params.slug.join('/');
  const doc = await getDocumentation(path);

  if (!doc) {
    return { title: 'Documentation not found' };
  }

  return {
    title: `${doc.title} | Documentation | Ordo Creator OS`,
    description: doc.description,
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const path = params.slug.join('/');
  const doc = await getDocumentation(path);

  if (!doc) {
    notFound();
  }

  return <DocumentationPage doc={doc} />;
}
```

### 6.3 Not Found Handler

**File: `src/app/[locale]/not-found.tsx`**

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg text-muted-foreground">Page not found</p>
      <Link href="/dashboard">
        <Button>Return to Dashboard</Button>
      </Link>
    </div>
  );
}
```

---

## 7. Parallel Routes & Intercepting Routes

### 7.1 Modal Intercept Pattern

**Use Case**: Open media upload dialog without changing URL, but allow direct navigation.

**File Structure**:
```
src/app/[locale]/(app)/media/
├── page.tsx                    # Media library
├── @modal/
│   ├── default.tsx            # Returns null (no modal by default)
│   └── (.)upload/
│       └── page.tsx           # Upload modal (intercepted)
└── upload/
    └── page.tsx               # Full upload page (if navigated directly)
```

**File: `src/app/[locale]/(app)/media/page.tsx`**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { MediaLibrary } from '@/components/media/library';
import { Button } from '@/components/ui/button';

export default function MediaPage({
  modal,
}: {
  modal: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Media Library</h1>
          <Button onClick={() => router.push('/media/upload')}>
            Upload
          </Button>
        </div>
        <MediaLibrary />
      </div>

      {/* Modal rendered here as a parallel route */}
      {modal}
    </>
  );
}
```

**File: `src/app/[locale]/(app)/media/@modal/default.tsx`**

```typescript
export default function DefaultModal() {
  return null;
}
```

**File: `src/app/[locale]/(app)/media/@modal/(.)upload/page.tsx`**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UploadForm } from '@/components/media/upload-form';

export default function UploadModal() {
  const router = useRouter();

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
        </DialogHeader>
        <UploadForm onSuccess={() => router.back()} />
      </DialogContent>
    </Dialog>
  );
}
```

### 7.2 Slide-Over Panel Pattern

**Use Case**: Project settings slide-over panel.

**File: `src/app/[locale]/(app)/projects/[id]/@panel/default.tsx`**

```typescript
export default function DefaultPanel() {
  return null;
}
```

**File: `src/app/[locale]/(app)/projects/[id]/@panel/(.)settings/page.tsx`**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ProjectSettings } from '@/components/projects/settings';

export default function ProjectSettingsPanel() {
  const router = useRouter();

  return (
    <Sheet open onOpenChange={(open) => !open && router.back()}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Project Settings</SheetTitle>
        </SheetHeader>
        <ProjectSettings />
      </SheetContent>
    </Sheet>
  );
}
```

---

## 8. Loading & Error States

### 8.1 Loading Skeleton Pattern

**File: `src/app/[locale]/(app)/dashboard/loading.tsx`**

```typescript
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-lg border p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
```

### 8.2 Error Boundary Pattern

**File: `src/app/[locale]/(app)/dashboard/error.tsx`**

```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">Something went wrong</h1>
        <p className="mb-4 text-muted-foreground">
          {error.message || 'An unexpected error occurred'}
        </p>
      </div>

      <div className="flex gap-4">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Return to Dashboard
        </Button>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8 w-full max-w-lg rounded-lg border bg-muted p-4">
          <summary className="cursor-pointer font-mono text-sm">Error details</summary>
          <pre className="mt-2 overflow-auto text-xs">{error.stack}</pre>
        </details>
      )}
    </div>
  );
}
```

---

## 9. Navigation Components

### 9.1 App Sidebar

**File: `src/components/app/sidebar.tsx`**

```typescript
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { navConfig } from '@/config/nav.config';
import { UserMenu } from './user-menu';

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo className="h-8 w-8" />
        <span className="hidden text-lg font-bold lg:inline">Ordo</span>
      </Link>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1">
        {navConfig.mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Settings and user menu */}
      <div className="space-y-1 border-t pt-4">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <SettingsIcon className="h-5 w-5" />
          <span className="hidden lg:inline">Settings</span>
        </Link>
        <UserMenu />
      </div>
    </div>
  );
}
```

### 9.2 App Header / Top Bar

**File: `src/components/app/header.tsx`**

```typescript
'use client';

import { usePathname } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { CommandPalette } from '@/components/command-palette';
import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppHeader() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between gap-4 border-b px-6 py-4">
      {/* Left: Breadcrumbs */}
      <Breadcrumbs />

      {/* Right: Search and Command Palette */}
      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Open command palette
            }}
            className="text-muted-foreground"
          >
            <SearchIcon className="mr-2 h-4 w-4" />
            <span className="text-xs">Cmd+K</span>
          </Button>
        </div>

        <CommandPalette />
      </div>
    </div>
  );
}
```

### 9.3 Mobile Bottom Navigation

**File: `src/components/app/mobile-bottom-nav.tsx`**

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navConfig } from '@/config/nav.config';

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-4 gap-1 px-2 py-2">
      {navConfig.mainNav.slice(0, 4).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex flex-col items-center gap-1 rounded-md py-2 text-xs transition-colors',
            pathname.startsWith(item.href)
              ? 'text-primary'
              : 'text-muted-foreground'
          )}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  );
}
```

### 9.4 Command Palette (Cmd+K)

**File: `src/components/command-palette.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const commands = [
    { label: 'Dashboard', value: '/dashboard', icon: '📊' },
    { label: 'Projects', value: '/projects', icon: '📁' },
    { label: 'Media Library', value: '/media', icon: '🖼️' },
    { label: 'Analytics', value: '/analytics', icon: '📈' },
    { label: 'Settings', value: '/settings', icon: '⚙️' },
    { label: 'Help', value: '/help', icon: '❓' },
  ];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden md:flex"
      >
        Search... ⌘K
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {commands.map((cmd) => (
              <CommandItem
                key={cmd.value}
                onSelect={() => {
                  router.push(cmd.value);
                  setOpen(false);
                }}
              >
                <span className="mr-2">{cmd.icon}</span>
                {cmd.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
```

---

## 10. Expo Router (Mobile)

### 10.1 Mobile Navigation Structure

**File: `apps/mobile/app.json` (Expo config)**

```json
{
  "expo": {
    "name": "Ordo Creator OS",
    "slug": "ordo-creator-os",
    "version": "1.0.0",
    "scheme": "ordocreator",
    "plugins": [
      [
        "expo-router",
        {
          "origin": "https://app.ordocreator.com"
        }
      ]
    ],
    "screens": {
      "NotFoundScreen": "*"
    }
  }
}
```

### 10.2 Expo Router App Structure

```
apps/mobile/app/
│
├── _layout.tsx                 # Root layout with providers
│
├── (auth)/                     # Auth stack
│   ├── _layout.tsx            # Auth navigator
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   └── reset-password/[token].tsx
│
├── (app)/                      # Main tab navigator
│   ├── _layout.tsx            # Tab navigator
│   │
│   ├── (dashboard)/           # Dashboard stack
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Dashboard home
│   │   └── [id].tsx
│   │
│   ├── (projects)/            # Projects stack
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Projects list
│   │   ├── [id].tsx           # Project detail
│   │   └── editor/[id].tsx    # Project editor
│   │
│   ├── (media)/               # Media stack
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Media library
│   │   └── upload.tsx         # Upload screen
│   │
│   ├── (more)/                # More stack (settings, etc.)
│   │   ├── _layout.tsx
│   │   ├── settings.tsx
│   │   ├── profile.tsx
│   │   └── help.tsx
│   │
│   └── +not-found.tsx         # 404 screen
│
├── (onboarding)/              # Onboarding flow
│   ├── _layout.tsx
│   ├── welcome.tsx
│   ├── profile-setup.tsx
│   └── first-project.tsx
│
└── +not-found.tsx             # Global 404
```

### 10.3 Root Layout with Providers

**File: `apps/mobile/app/_layout.tsx`**

```typescript
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { RootProvider } from '@/providers/root-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading, isAuthenticated, hydrateAuth } = useAuthStore();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('@/assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  if (!fontsLoaded || isLoading) {
    return null;
  }

  return (
    <RootProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="(auth)" options={{ animationEnabled: false }} />
        ) : (
          <Stack.Screen name="(app)" options={{ animationEnabled: false }} />
        )}
      </Stack>
    </RootProvider>
  );
}
```

### 10.4 Tab Navigator

**File: `apps/mobile/app/(app)/_layout.tsx`**

```typescript
import { Tabs } from 'expo-router';
import {
  BarChart3,
  Home,
  Library,
  MoreHorizontal,
  Folder,
} from 'lucide-react-native';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopColor: '#e5e5e5',
          paddingBottom: 0,
          paddingTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="(projects)"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color }) => <Folder color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="(media)"
        options={{
          title: 'Media',
          tabBarIcon: ({ color }) => <Library color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="(more)"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
```

### 10.5 Stack Navigation Within Tab

**File: `apps/mobile/app/(app)/(projects)/_layout.tsx`**

```typescript
import { Stack } from 'expo-router';

export default function ProjectsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Projects',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Project Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="editor/[id]"
        options={{
          title: 'Editor',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
```

### 10.6 Auth Stack

**File: `apps/mobile/app/(auth)/_layout.tsx`**

```typescript
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AuthLayout() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Stack
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
          cardStyle: { backgroundColor: '#fff' },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen
          name="forgot-password"
          options={{
            title: 'Forgot Password',
          }}
        />
        <Stack.Screen
          name="reset-password/[token]"
          options={{
            title: 'Reset Password',
          }}
        />
      </Stack>
    </>
  );
}
```

---

## 11. Deep Linking Strategy

### 11.1 Deep Link Scheme

**Scheme**: `ordocreator://`

**URL Mapping**:

| URL Pattern | Scheme | Mobile Route | Web Route |
|---|---|---|---|
| Dashboard | `ordocreator://dashboard` | `(app)/(dashboard)/index` | `/dashboard` |
| Project | `ordocreator://projects/123` | `(app)/(projects)/[id]` | `/projects/123` |
| Editor | `ordocreator://editor/abc` | `(app)/(projects)/editor/[id]` | `/editor/abc` |
| Share Link | `https://app.ordocreator.com/share/abc123` | Handle via universal link | `/share/abc123` |

### 11.2 Universal Links Configuration

**File: `apps/mobile/app.json`**

```json
{
  "expo": {
    "plugins": [
      [
        "expo-router",
        {
          "origin": "https://app.ordocreator.com",
          "prefixes": ["ordocreator://"]
        }
      ]
    ]
  }
}
```

**File: `.well-known/apple-app-site-association` (web)**

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.ordocreator",
        "paths": [
          "/projects/*",
          "/editor/*",
          "/share/*",
          "/dashboard"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAM_ID.com.ordocreator"]
  }
}
```

**File: `assetlinks.json` (Android)**

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ordocreator",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:..."
      ]
    }
  }
]
```

### 11.3 Deep Link Handler

**File: `apps/mobile/app/(app)/[...unmatched].tsx`**

```typescript
import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

export async function getInitialURL() {
  const url = await Linking.getInitialURL();
  if (url != null) {
    return url;
  }
  // Handle notification opened
  // return getDeepLinkFromNotification();
}

export function useLinkingConfiguration() {
  const router = useRouter();

  useEffect(() => {
    const onReceiveURL = ({ url }: { url: string }) => {
      const pathname = url.replace(prefix, '');
      router.push(pathname);
    };

    const subscription = Linking.addEventListener('url', onReceiveURL);

    return () => {
      subscription.remove();
    };
  }, [router]);
}

export default function UnmatchedScreen() {
  return null;
}
```

### 11.4 Sharing Implementation

**File: `src/lib/share.ts`**

```typescript
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

interface ShareContentOptions {
  type: 'project' | 'editor' | 'content';
  id: string;
  title: string;
  description?: string;
}

export async function generateShareLink(options: ShareContentOptions): Promise<string> {
  const baseUrl = 'https://app.ordocreator.com';

  switch (options.type) {
    case 'project':
      return `${baseUrl}/projects/${options.id}`;
    case 'editor':
      return `${baseUrl}/editor/${options.id}`;
    case 'content':
      return `${baseUrl}/share/${options.id}`;
    default:
      return baseUrl;
  }
}

export async function shareContent(options: ShareContentOptions & { url?: string }): Promise<void> {
  const url = options.url || (await generateShareLink(options));

  if (Platform.OS === 'web') {
    // Web: Use native share API if available
    if (navigator.share) {
      await navigator.share({
        title: options.title,
        text: options.description || '',
        url,
      });
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(url);
    }
  } else {
    // Mobile: Use Expo Sharing
    await Sharing.shareAsync(url, {
      mimeType: 'text/plain',
      message: `${options.title}\n${url}`,
    });
  }
}
```

---

## 12. Electron Navigation

### 12.1 Electron Window Management

**File: `apps/desktop/src/main.ts`**

```typescript
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupMenu();
}

function setupMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for navigation
ipcMain.handle('navigate', (_, route: string) => {
  if (mainWindow) {
    mainWindow.webContents.send('navigate', route);
  }
});
```

### 12.2 Electron-Specific Routes

**File: `apps/desktop/src/bridge/router.ts`**

```typescript
import { ipcRenderer } from 'electron';

export class ElectronRouter {
  private listeners: Map<string, (route: string) => void> = new Map();

  constructor() {
    ipcRenderer.on('navigate', (_, route: string) => {
      this.listeners.forEach((listener) => listener(route));
    });
  }

  navigate(route: string) {
    // Route from Electron menu
    window.location.href = route;
  }

  subscribe(id: string, callback: (route: string) => void) {
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }
}

export const electronRouter = new ElectronRouter();
```

### 12.3 Bridging Next.js Routes to Electron

**File: `apps/web/src/lib/electron-bridge.ts`**

```typescript
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const isElectron = () => {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
};

export function useElectronRouter() {
  const router = useRouter();

  useEffect(() => {
    if (!isElectron()) return;

    const unsubscribe = (window as any).electronAPI?.router?.subscribe?.(
      'next-router',
      (route: string) => {
        router.push(route);
      }
    );

    return () => unsubscribe?.();
  }, [router]);

  return router;
}
```

---

## 13. Page Transitions & Animations

### 13.1 View Transitions API

**File: `src/lib/transitions.ts`**

```typescript
export async function navigateWithTransition(
  href: string,
  callback: () => void
) {
  if (!document.startViewTransition) {
    callback();
    return;
  }

  const transition = document.startViewTransition(callback);
  await transition.finished;
}

export function useViewTransition() {
  const router = useRouter();

  return (href: string) => {
    navigateWithTransition(href, () => {
      router.push(href);
    });
  };
}
```

### 13.2 Route-Specific Animations

**File: `src/components/app/dashboard/dashboard-client.tsx`**

```typescript
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: { opacity: 0 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

export function DashboardClient() {
  useEffect(() => {
    // Enable view transitions
    document.documentElement.style.viewTransitionName = 'root';
  }, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        {/* Stats cards */}
      </motion.div>
      <motion.div variants={itemVariants}>
        {/* Charts */}
      </motion.div>
    </motion.div>
  );
}
```

---

## 14. Prefetching & Data Loading

### 14.1 Link Prefetching

**File: `src/components/ui/link.tsx`**

```typescript
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

interface PrefetchLinkProps
  extends React.ComponentPropsWithoutRef<typeof Link> {
  prefetch?: boolean;
  prefetchData?: () => Promise<any>;
}

export function PrefetchLink({
  href,
  prefetch = true,
  prefetchData,
  onMouseEnter,
  ...props
}: PrefetchLinkProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleMouseEnter = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefetch) {
      router.prefetch(href as string);

      if (prefetchData) {
        try {
          await prefetchData();
        } catch (err) {
          console.warn('Prefetch data error:', err);
        }
      }
    }

    onMouseEnter?.(e);
  };

  return (
    <Link href={href} onMouseEnter={handleMouseEnter} {...props} />
  );
}
```

### 14.2 Route Preloading on Hover

**File: `src/components/projects/project-card.tsx`**

```typescript
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProject } from '@/lib/api';

interface ProjectCardProps {
  id: string;
  name: string;
}

export function ProjectCard({ id, name }: ProjectCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch route
    router.prefetch(`/projects/${id}`);

    // Prefetch data
    queryClient.prefetchQuery({
      queryKey: ['project', id],
      queryFn: () => getProject(id),
      staleTime: 30000,
    });
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <Link href={`/projects/${id}`}>
        <h3>{name}</h3>
      </Link>
    </div>
  );
}
```

### 14.3 Data Prefetching with React Query

**File: `src/hooks/use-project-prefetch.ts`**

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { getProject, getProjectAnalytics } from '@/lib/api';

export function useProjectPrefetch(projectId: string) {
  const queryClient = useQueryClient();

  return {
    prefetchProject: async () => {
      await queryClient.prefetchQuery({
        queryKey: ['project', projectId],
        queryFn: () => getProject(projectId),
        staleTime: 30000,
      });
    },

    prefetchAnalytics: async () => {
      await queryClient.prefetchQuery({
        queryKey: ['analytics', projectId],
        queryFn: () => getProjectAnalytics(projectId),
        staleTime: 60000,
      });
    },

    prefetchAll: async () => {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['project', projectId],
          queryFn: () => getProject(projectId),
        }),
        queryClient.prefetchQuery({
          queryKey: ['analytics', projectId],
          queryFn: () => getProjectAnalytics(projectId),
        }),
      ]);
    },
  };
}
```

---

## Summary Table: Routing Overview

| Feature | Implementation | File Location |
|---|---|---|
| **Locale Detection** | Middleware + cookies | `src/middleware.ts` |
| **Auth Redirect** | Middleware + layouts | `src/middleware.ts`, `(auth)/layout.tsx` |
| **Protected Routes** | Server + client checks | `src/middleware.ts`, `(app)/layout.tsx` |
| **Dynamic Segments** | `[id]` syntax | `projects/[id]/page.tsx` |
| **Catch-All Routes** | `[...slug]` syntax | `docs/[...slug]/page.tsx` |
| **Modal Routes** | Parallel routes `@modal` | `media/@modal/(.)upload/page.tsx` |
| **Sidebar Navigation** | Client component | `components/app/sidebar.tsx` |
| **Command Palette** | Cmd+K listener | `components/command-palette.tsx` |
| **Mobile Tabs** | Expo Router | `apps/mobile/app/(app)/_layout.tsx` |
| **Deep Linking** | Universal links + scheme | `.well-known/apple-app-site-association` |
| **Page Animations** | Framer Motion + View Transitions | `lib/transitions.ts` |
| **Prefetching** | Router + React Query | `hooks/use-project-prefetch.ts` |

---

## Best Practices

1. **Always protect routes server-side first** - Middleware catches unauthenticated requests early
2. **Use dynamic segments for IDs** - Enables SSR, caching, and prefetching
3. **Parallel routes for modals** - Keeps URL clean, allows direct navigation
4. **Locale in all routes** - Ensures i18n works across entire app
5. **Loading states for slow routes** - Use loading.tsx skeletons per segment
6. **Error boundaries per section** - Isolate failures to specific features
7. **Prefetch on interaction** - Hover effects improve perceived performance
8. **Deep links map 1:1** - Mobile and web routes must be mappable to each other
9. **Mobile-first navigation** - Bottom tabs for 4-5 main sections, stack within
10. **Consistent breadcrumbs** - Help users understand location in app hierarchy
