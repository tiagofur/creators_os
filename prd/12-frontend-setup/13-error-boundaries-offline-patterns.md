# Error Boundaries & Offline Patterns — Ordo Creator OS

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Zustand, React Query v5, Sentry, Expo Router, Electron, Tailwind CSS, ShadCN/UI

**Last Updated:** 2026-03-10

---

## Table of Contents

1. [Error Boundary Architecture](#1-error-boundary-architecture)
2. [React Error Boundary Implementation](#2-react-error-boundary-implementation)
3. [Next.js error.tsx & not-found.tsx](#3-nextjs-errortsx--not-foundtsx)
4. [Fallback UI Components](#4-fallback-ui-components)
5. [Sentry Integration](#5-sentry-integration)
6. [API Error Handling](#6-api-error-handling)
7. [React Query Error Handling](#7-react-query-error-handling)
8. [Form Error Handling](#8-form-error-handling)
9. [Offline Detection](#9-offline-detection)
10. [Offline Mutation Queue](#10-offline-mutation-queue)
11. [Service Worker & PWA](#11-service-worker--pwa)
12. [Mobile Offline (Expo)](#12-mobile-offline-expo)
13. [Electron Error Handling](#13-electron-error-handling)
14. [Graceful Degradation](#14-graceful-degradation)
15. [Testing Error Scenarios](#15-testing-error-scenarios)
16. [Implementation Checklist](#16-implementation-checklist)

---

## 1. Error Boundary Architecture

### Hierarchy & Containment Strategy

```
App Root
  ├── Global Error Boundary (RootErrorBoundary)
  │
  ├── Layout Error Boundary
  │
  ├── Route Segment (error.tsx per route)
  │   └── Feature Error Boundary
  │       └── Component Error Boundary
  │           └── Child Components
```

**Key Principles:**

- **App-level:** Catches unhandled React errors, prevents white screen
- **Route-level:** Catches per-route errors, allows other routes to function
- **Feature-level:** Wraps feature modules (e.g., CreatorProjects, Analytics)
- **Component-level:** Wraps risky components (heavy rendering, third-party libs)

**Error Propagation:**

- Errors bubble up the boundary hierarchy
- First matching error boundary captures and renders fallback
- Non-React errors (async, timers) are not caught by boundaries
- Use Sentry for async/network errors

**File Structure:**

```
app/
  ├── error.tsx                  # Root error handler
  ├── global-error.tsx           # Outermost boundary
  ├── layout.tsx                 # With ErrorBoundaryProvider
  ├── dashboard/
  │   ├── error.tsx              # Route-level handler
  │   └── layout.tsx
  ├── projects/
  │   ├── error.tsx
  │   ├── [id]/
  │   │   └── error.tsx
  │   └── layout.tsx
```

---

## 2. React Error Boundary Implementation

### Class Component (Error Boundary Base)

```typescript
// lib/errors/ErrorBoundary.tsx

import React, { ReactNode, ErrorInfo } from 'react'
import { captureException } from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'app' | 'route' | 'feature' | 'component'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state
    this.setState({ errorInfo })

    // Log to Sentry
    captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
          level: this.props.level || 'component',
        },
      },
    })

    // Call custom error handler
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props

      return fallback ? (
        fallback(this.state.error, this.handleReset)
      ) : (
        <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-red-700 mb-4">
              {this.state.error.message}
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Functional Hook (`useErrorBoundary`)

```typescript
// lib/hooks/useErrorBoundary.ts

import { useCallback } from 'react'
import { useErrorHandler } from 'react-error-boundary'
import { captureException } from '@sentry/nextjs'

interface UseErrorBoundaryOptions {
  context?: string
  level?: 'feature' | 'component'
  onError?: (error: Error) => void
}

export function useErrorBoundary(
  options: UseErrorBoundaryOptions = {}
) {
  const handleError = useErrorHandler()
  const { context = 'unknown', level = 'component', onError } = options

  const captureError = useCallback(
    (error: Error | unknown) => {
      const err = error instanceof Error ? error : new Error(String(error))

      // Log to Sentry with context
      captureException(err, {
        tags: { context, level },
      })

      // Call custom handler
      onError?.(err)

      // Throw to boundary
      handleError(err)
    },
    [context, level, handleError, onError]
  )

  const captureAndThrow = useCallback(
    async (promise: Promise<any>) => {
      try {
        return await promise
      } catch (error) {
        captureError(error)
      }
    },
    [captureError]
  )

  return {
    captureError,
    captureAndThrow,
    resetBoundary: () => {
      // Reset state if using react-error-boundary
    },
  }
}
```

### Higher-Order Component (withErrorBoundary)

```typescript
// lib/hoc/withErrorBoundary.tsx

import React, { ComponentType, ReactNode } from 'react'
import { ErrorBoundary } from '@/lib/errors/ErrorBoundary'

interface WithErrorBoundaryOptions {
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error) => void
  level?: 'feature' | 'component'
}

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary
      fallback={options.fallback}
      onError={options.onError}
      level={options.level}
    >
      <Component {...props} />
    </ErrorBoundary>
  )

  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return Wrapped
}
```

### React Error Boundary with react-error-boundary

```typescript
// lib/errors/ErrorBoundaryWrapper.tsx

import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { ReactNode } from 'react'
import { captureException } from '@sentry/nextjs'

interface ErrorBoundaryWrapperProps {
  children: ReactNode
  fallback?: (props: FallbackProps) => ReactNode
  onError?: (error: Error) => void
  level?: 'app' | 'route' | 'feature' | 'component'
}

function DefaultErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-bold text-destructive mb-2">
          {error.message || 'An error occurred'}
        </h2>
        <button
          onClick={resetErrorBoundary}
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

export function ErrorBoundaryWrapper({
  children,
  fallback,
  onError,
  level = 'component',
}: ErrorBoundaryWrapperProps) {
  const handleError = (error: Error, info: { componentStack: string }) => {
    captureException(error, {
      contexts: {
        react: {
          componentStack: info.componentStack,
          level,
        },
      },
    })
    onError?.(error)
  }

  return (
    <ErrorBoundary
      FallbackComponent={fallback || DefaultErrorFallback}
      onError={handleError}
      onReset={() => {
        // Clean up any app state here if needed
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
```

---

## 3. Next.js error.tsx & not-found.tsx

### Root Error Handler (app/error.tsx)

```typescript
// app/error.tsx

'use client'

import { useEffect } from 'react'
import { captureException } from '@sentry/nextjs'
import { Button } from '@ordo/ui'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to Sentry
    captureException(error, {
      tags: {
        errorType: 'nextjs-root-error',
        digest: error.digest,
      },
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-lg p-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-muted-foreground mb-2">
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mb-4">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              Try Again
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Global Error Handler (app/global-error.tsx)

```typescript
// app/global-error.tsx

'use client'

import { useEffect } from 'react'
import { captureException } from '@sentry/nextjs'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error:', error)
    captureException(error, {
      tags: {
        errorType: 'nextjs-global-error',
      },
    })
  }, [error])

  return (
    <html>
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h1 className="text-4xl font-bold mb-4">500</h1>
            <p className="text-lg mb-4">Something critical went wrong</p>
            <p className="text-sm text-muted-foreground mb-6">
              Error ID: {error.digest || 'unknown'}
            </p>
            <button
              onClick={reset}
              className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
```

### Route-Level Error Handler (app/dashboard/error.tsx)

```typescript
// app/dashboard/error.tsx

'use client'

import { useEffect } from 'react'
import { captureException } from '@sentry/nextjs'
import { Button } from '@ordo/ui'
import { AlertCircle } from 'lucide-react'

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps) {
  useEffect(() => {
    captureException(error, {
      tags: {
        errorType: 'dashboard-error',
        route: '/dashboard',
      },
    })
  }, [error])

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-md mx-auto bg-card border border-destructive/50 rounded-lg p-6">
        <AlertCircle className="w-8 h-8 text-destructive mb-3" />
        <h2 className="text-lg font-bold mb-2">Dashboard Error</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Failed to load dashboard. Please try again.
        </p>
        <Button onClick={reset} className="w-full">
          Retry
        </Button>
      </div>
    </div>
  )
}
```

### Not Found Handler (app/not-found.tsx)

```typescript
// app/not-found.tsx

import { Button } from '@ordo/ui'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
        </div>
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild className="w-full">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  )
}
```

### Dynamic Route Error (app/projects/[id]/error.tsx)

```typescript
// app/projects/[id]/error.tsx

'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { captureException } from '@sentry/nextjs'
import { Button } from '@ordo/ui'

interface ProjectErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ProjectError({ error, reset }: ProjectErrorProps) {
  const params = useParams()
  const projectId = params?.id as string

  useEffect(() => {
    captureException(error, {
      tags: {
        errorType: 'project-detail-error',
        projectId,
      },
      contexts: {
        project: {
          id: projectId,
        },
      },
    })
  }, [error, projectId])

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Error Loading Project</h1>
        <p className="text-muted-foreground mb-4">
          Failed to load project: {projectId}
        </p>
        <div className="flex gap-2">
          <Button onClick={reset} className="flex-1">
            Retry
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <a href="/projects">Back to Projects</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## 4. Fallback UI Components

### ErrorFallback Component

```typescript
// components/error/ErrorFallback.tsx

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@ordo/ui'

interface ErrorFallbackProps {
  error?: Error
  resetErrorBoundary?: () => void
  title?: string
  description?: string
  showDetails?: boolean
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  showDetails = process.env.NODE_ENV === 'development',
}: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <div className="max-w-md w-full">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="flex gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {description}
              </p>
              {showDetails && error && (
                <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32 text-foreground mb-4">
                  {error.message}
                </pre>
              )}
            </div>
          </div>
          <Button
            onClick={resetErrorBoundary}
            className="w-full"
            size="sm"
            disabled={!resetErrorBoundary}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### EmptyState Component

```typescript
// components/state/EmptyState.tsx

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from '@ordo/ui'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondary?: {
    label: string
    href: string
  }
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondary,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <Icon className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-xs">{description}</p>
      <div className="flex gap-2">
        {action && (
          <Button onClick={action.onClick}>{action.label}</Button>
        )}
        {secondary && (
          <Button variant="outline" asChild>
            <a href={secondary.href}>{secondary.label}</a>
          </Button>
        )}
      </div>
    </div>
  )
}
```

### NotFoundPage Component

```typescript
// components/error/NotFoundPage.tsx

import Link from 'next/link'
import { Button } from '@ordo/ui'
import { AlertCircle } from 'lucide-react'

interface NotFoundPageProps {
  title?: string
  description?: string
  showHomeButton?: boolean
  showBackButton?: boolean
}

export function NotFoundPage({
  title = 'Page Not Found',
  description = 'The page you are looking for might have been removed or is temporarily unavailable.',
  showHomeButton = true,
  showBackButton = true,
}: NotFoundPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-3">{title}</h2>
        <p className="text-muted-foreground mb-8">{description}</p>
        <div className="flex gap-3">
          {showBackButton && (
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="flex-1"
            >
              Go Back
            </Button>
          )}
          {showHomeButton && (
            <Button asChild className="flex-1">
              <Link href="/">Home</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

### ForbiddenPage Component

```typescript
// components/error/ForbiddenPage.tsx

import Link from 'next/link'
import { Button } from '@ordo/ui'
import { Lock } from 'lucide-react'

interface ForbiddenPageProps {
  message?: string
}

export function ForbiddenPage({
  message = 'You do not have permission to access this resource.',
}: ForbiddenPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <Lock className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Access Denied
        </h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        <Button asChild className="w-full">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  )
}
```

### ServerErrorPage Component

```typescript
// components/error/ServerErrorPage.tsx

import Link from 'next/link'
import { Button } from '@ordo/ui'
import { AlertTriangle } from 'lucide-react'

interface ServerErrorPageProps {
  statusCode?: number
  message?: string
}

export function ServerErrorPage({
  statusCode = 500,
  message = 'The server encountered an error and could not complete your request.',
}: ServerErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {statusCode}
        </h1>
        <h2 className="text-xl font-semibold text-foreground mb-3">
          Server Error
        </h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            Reload
          </Button>
          <Button asChild className="flex-1">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### MaintenancePage Component

```typescript
// components/error/MaintenancePage.tsx

import { Button } from '@ordo/ui'
import { AlertCircle } from 'lucide-react'

interface MaintenancePageProps {
  estimatedTime?: string
  contactEmail?: string
}

export function MaintenancePage({
  estimatedTime = 'a few hours',
  contactEmail = 'support@ordo.app',
}: MaintenancePageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Under Maintenance
        </h1>
        <p className="text-muted-foreground mb-4">
          We're currently performing scheduled maintenance to improve your
          experience.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          We expect to be back online in {estimatedTime}.
        </p>
        <div className="bg-muted p-4 rounded-lg mb-6">
          <p className="text-sm font-medium text-foreground mb-1">Need help?</p>
          <a
            href={`mailto:${contactEmail}`}
            className="text-primary hover:underline text-sm"
          >
            Contact us
          </a>
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}

          className="w-full"
        >
          Check Again
        </Button>
      </div>
    </div>
  )
}
```

---

## 5. Sentry Integration

### Sentry Client Config (sentry.client.config.ts)

```typescript
// sentry.client.config.ts

import * as Sentry from '@sentry/nextjs'
import { CaptureConsole as CaptureConsoleIntegration } from '@sentry/integrations'

export function initClientSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_AUTH_TOKEN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',
      integrations: [
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
        new CaptureConsoleIntegration({
          levels: ['warn', 'error'],
        }),
        Sentry.captureConsoleIntegration(),
      ],
      tracesSampleRate:
        process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' ? 1.0 : 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      maxBreadcrumbs: 50,
      maxValueLength: 1024,
      beforeSend(event, hint) {
        // Filter out known safe errors
        if (hint.originalException instanceof Error) {
          const message = hint.originalException.message
          if (message.includes('NetworkError') && navigator.onLine === false) {
            return null // Don't send offline errors
          }
        }
        return event
      },
    })
  }
}

// Call in your root layout or _app
if (typeof window !== 'undefined') {
  initClientSentry()
}
```

### Sentry Server Config (sentry.server.config.ts)

```typescript
// sentry.server.config.ts

import * as Sentry from '@sentry/nextjs'

export function initServerSentry() {
  if (process.env.SENTRY_AUTH_TOKEN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
      integrations: [
        new Sentry.Integrations.Modules(),
        new Sentry.Integrations.FunctionToString(),
        new Sentry.Integrations.LinkedErrors(),
        new Sentry.Integrations.RequestData(),
        new Sentry.Integrations.Http({ tracing: true }),
      ],
      tracesSampleRate:
        process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
      maxBreadcrumbs: 100,
      beforeSend(event, hint) {
        // Filter sensitive data
        if (event.request?.cookies) {
          event.request.cookies = '[REDACTED]'
        }
        return event
      },
    })
  }
}
```

### Sentry Edge Config (sentry.edge.config.ts)

```typescript
// sentry.edge.config.ts

import * as Sentry from '@sentry/nextjs'

export function initEdgeSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  })
}
```

### Next.js Instrumentation Hook

```typescript
// instrumentation.ts

import { initServerSentry } from './sentry.server.config'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    initServerSentry()
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const { initEdgeSentry } = await import('./sentry.edge.config')
    initEdgeSentry()
  }
}
```

### Custom Error Context & Breadcrumbs

```typescript
// lib/sentry/errorContext.ts

import * as Sentry from '@sentry/nextjs'

interface ErrorContextData {
  userTier?: 'free' | 'pro' | 'enterprise'
  featureFlags?: Record<string, boolean>
  route?: string
  userId?: string
  sessionId?: string
}

export function setErrorContext(data: ErrorContextData) {
  Sentry.setContext('user_info', {
    tier: data.userTier,
    features: data.featureFlags,
  })

  Sentry.setContext('route_info', {
    path: data.route,
  })

  if (data.userId) {
    Sentry.setUser({
      id: data.userId,
    })
  }

  if (data.sessionId) {
    Sentry.captureMessage('Session Context Updated', 'info')
  }
}

export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info'
) {
  Sentry.captureMessage(message, level)
  Sentry.addBreadcrumb({
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  })
}

export function addErrorGrouping(fingerprint: string[]) {
  Sentry.withScope((scope) => {
    scope.setFingerprint(fingerprint)
  })
}
```

### Sentry Wrapper Hook

```typescript
// lib/hooks/useSentry.ts

import { useEffect, useCallback } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags'
import { setErrorContext, addBreadcrumb } from '@/lib/sentry/errorContext'

export function useSentry() {
  const { user } = useUser()
  const { flags } = useFeatureFlags()

  useEffect(() => {
    if (user) {
      setErrorContext({
        userId: user.id,
        userTier: user.tier,
        featureFlags: flags,
      })
    }
  }, [user, flags])

  const logEvent = useCallback(
    (event: string, metadata?: Record<string, any>) => {
      addBreadcrumb(event, metadata)
    },
    []
  )

  return { logEvent, setContext: setErrorContext }
}
```

---

## 6. API Error Handling

### AppError Class

```typescript
// lib/errors/AppError.ts

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR'

export interface AppErrorOptions {
  code: ErrorCode
  message: string
  statusCode: number
  details?: Record<string, any>
  cause?: Error
  retryable?: boolean
}

export class AppError extends Error {
  code: ErrorCode
  statusCode: number
  details: Record<string, any>
  cause?: Error
  retryable: boolean
  timestamp: Date

  constructor(options: AppErrorOptions) {
    super(options.message)
    this.name = 'AppError'
    this.code = options.code
    this.statusCode = options.statusCode
    this.details = options.details || {}
    this.cause = options.cause
    this.retryable = options.retryable ?? false
    this.timestamp = new Date()

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
    }
  }

  static fromStatus(
    statusCode: number,
    message?: string,
    details?: Record<string, any>
  ): AppError {
    const mapping: Record<number, { code: ErrorCode; retryable: boolean }> = {
      400: { code: 'VALIDATION_ERROR', retryable: false },
      401: { code: 'AUTH_ERROR', retryable: false },
      403: { code: 'FORBIDDEN', retryable: false },
      404: { code: 'NOT_FOUND', retryable: false },
      409: { code: 'CONFLICT', retryable: true },
      429: { code: 'RATE_LIMITED', retryable: true },
      500: { code: 'SERVER_ERROR', retryable: true },
      503: { code: 'SERVER_ERROR', retryable: true },
      0: { code: 'NETWORK_ERROR', retryable: true },
    }

    const { code, retryable } = mapping[statusCode] || {
      code: 'UNKNOWN_ERROR' as ErrorCode,
      retryable: false,
    }

    return new AppError({
      code,
      message:
        message ||
        `HTTP ${statusCode}: ${this.getDefaultMessage(statusCode)}`,
      statusCode,
      details,
      retryable,
    })
  }

  private static getDefaultMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    }
    return messages[statusCode] || 'Unknown Error'
  }
}
```

### HTTP Status Mapping & User Messages

```typescript
// lib/errors/errorMessages.ts

import { AppError } from './AppError'

export const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR:
    'Please check your input and try again.',
  AUTH_ERROR:
    'Your session has expired. Please log in again.',
  UNAUTHORIZED:
    'You are not authorized to perform this action.',
  FORBIDDEN:
    'You do not have permission to access this resource.',
  NOT_FOUND:
    'The resource you are looking for does not exist.',
  CONFLICT:
    'This action conflicts with existing data. Please refresh and try again.',
  RATE_LIMITED:
    'You are making too many requests. Please slow down and try again.',
  SERVER_ERROR:
    'The server encountered an error. Our team has been notified. Please try again later.',
  NETWORK_ERROR:
    'Network connection failed. Please check your internet and try again.',
  TIMEOUT_ERROR:
    'The request took too long. Please try again.',
  UNKNOWN_ERROR:
    'An unexpected error occurred. Please try again.',
}

export function getUserFriendlyMessage(error: AppError | Error): string {
  if (error instanceof AppError) {
    return USER_FRIENDLY_MESSAGES[error.code] || error.message
  }
  return USER_FRIENDLY_MESSAGES.UNKNOWN_ERROR
}

export function isRetryableError(error: AppError | Error): boolean {
  if (error instanceof AppError) {
    return error.retryable
  }
  return false
}
```

### Retry with Exponential Backoff

```typescript
// lib/api/retry.ts

export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  shouldRetry?: (error: Error) => boolean
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | null = null
  let delay = finalConfig.initialDelayMs

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      const shouldRetry =
        finalConfig.shouldRetry?.(lastError) ??
        isRetryableError(lastError)

      if (!shouldRetry || attempt === finalConfig.maxAttempts) {
        throw error
      }

      // Calculate exponential backoff
      const jitter = Math.random() * 0.1 * delay
      const nextDelay = Math.min(
        delay * finalConfig.backoffMultiplier + jitter,
        finalConfig.maxDelayMs
      )

      console.debug(
        `Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${nextDelay}ms`
      )

      await new Promise((resolve) => setTimeout(resolve, nextDelay))
      delay = nextDelay
    }
  }

  throw lastError
}

function isRetryableError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.retryable
  }
  return false
}
```

### Circuit Breaker Pattern

```typescript
// lib/api/circuitBreaker.ts

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  successThreshold: number
  timeout: number
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
}

class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private successCount = 0
  private lastFailureTime: number | null = null
  private readonly config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async execute<R>(fn: () => Promise<R>): Promise<R> {
    if (this.state === CircuitState.OPEN) {
      if (this.isTimeoutExpired()) {
        this.state = CircuitState.HALF_OPEN
        this.successCount = 0
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++
        if (this.successCount >= this.config.successThreshold) {
          this.reset()
        }
      } else {
        this.failureCount = 0
      }

      return result
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()

      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN
      }

      throw error
    }
  }

  private isTimeoutExpired(): boolean {
    return (
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.config.timeout
    )
  }

  private reset() {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
  }

  getState(): CircuitState {
    return this.state
  }
}

export { CircuitBreaker }
```

### Centralized API Error Handler

```typescript
// lib/api/client.ts

import { AppError } from '@/lib/errors/AppError'
import { retryWithBackoff } from './retry'
import { CircuitBreaker } from './circuitBreaker'

export interface RequestConfig {
  method?: string
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retryable?: boolean
  skipCircuitBreaker?: boolean
}

class ApiClient {
  private baseUrl: string
  private circuitBreaker: CircuitBreaker<Response>

  constructor(baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api') {
    this.baseUrl = baseUrl
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      timeout: 60000,
    })
  }

  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await retryWithBackoff(
        async () => {
          if (!config.skipCircuitBreaker) {
            return await this.circuitBreaker.execute(() =>
              this.fetchWithTimeout(url, config)
            )
          }
          return await this.fetchWithTimeout(url, config)
        },
        {
          maxAttempts: config.retryable !== false ? 3 : 1,
        }
      )

      return await this.handleResponse<T>(response)
    } catch (error) {
      throw this.handleError(error, endpoint)
    }
  }

  async get<T = any>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  async post<T = any>(
    endpoint: string,
    body?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async put<T = any>(
    endpoint: string,
    body?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async delete<T = any>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }

  private async fetchWithTimeout(
    url: string,
    config: RequestConfig
  ): Promise<Response> {
    const timeout = config.timeout || 30000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      return await fetch(url, {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: config.body,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw AppError.fromStatus(
        response.status,
        data.message,
        data
      )
    }

    return response.json()
  }

  private handleError(error: unknown, endpoint: string): Error {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return AppError.fromStatus(
        0,
        'Network error',
        { endpoint }
      )
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      return AppError.fromStatus(
        0,
        'Request timeout',
        { endpoint }
      )
    }

    return AppError.fromStatus(
      500,
      error instanceof Error ? error.message : 'Unknown error',
      { endpoint }
    )
  }
}

export const apiClient = new ApiClient()
```

---

## 7. React Query Error Handling

### QueryClient Setup with Global Error Handler

```typescript
// lib/query/queryClient.ts

import { QueryClient } from '@tanstack/react-query'
import { AppError, getUserFriendlyMessage } from '@/lib/errors/AppError'
import { captureException } from '@sentry/nextjs'

export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        retry: (failureCount, error) => {
          // Don't retry client errors
          if (error instanceof AppError) {
            return !failureCount && error.retryable
          }
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => {
          return Math.min(1000 * 2 ** attemptIndex, 30000)
        },
      },
      mutations: {
        retry: 0, // Mutations don't retry by default
        onError: (error) => {
          // Global mutation error handler
          captureException(error, {
            tags: { type: 'mutation_error' },
          })
        },
      },
    },
  })
}
```

### Query Error Boundary Integration

```typescript
// lib/query/useQueryErrorHandler.ts

import { useCallback } from 'react'
import { useErrorHandler } from 'react-error-boundary'
import { useQueryClient } from '@tanstack/react-query'
import { AppError, getUserFriendlyMessage } from '@/lib/errors/AppError'

export function useQueryErrorHandler() {
  const handleError = useErrorHandler()
  const queryClient = useQueryClient()

  const handleQueryError = useCallback(
    (error: unknown, queryKey?: string[]) => {
      if (error instanceof AppError) {
        // Log to console in dev
        if (process.env.NODE_ENV === 'development') {
          console.error(`Query Error [${queryKey?.join('/')}]:`, error)
        }

        // Throw to boundary for UI display
        handleError(error)
      } else {
        handleError(error)
      }
    },
    [handleError]
  )

  const clearErrorForQueryKey = useCallback(
    (queryKey: string[]) => {
      queryClient.setQueryData(queryKey, (oldData: any) => oldData)
    },
    [queryClient]
  )

  return {
    handleQueryError,
    clearErrorForQueryKey,
  }
}
```

### Per-Query Error Handling Hook

```typescript
// lib/query/useQueryWithErrorBoundary.ts

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { useQueryErrorHandler } from './useQueryErrorHandler'
import { useCallback } from 'react'

interface UseQueryWithErrorBoundaryOptions<TData, TError>
  extends Omit<UseQueryOptions<TData, TError>, 'queryFn'> {
  queryFn: () => Promise<TData>
  onError?: (error: TError) => void
  throwOnError?: boolean
}

export function useQueryWithErrorBoundary<TData = unknown, TError = Error>({
  queryKey,
  queryFn,
  onError,
  throwOnError = true,
  ...options
}: UseQueryWithErrorBoundaryOptions<TData, TError>) {
  const { handleQueryError } = useQueryErrorHandler()

  const handleError = useCallback(
    (error: TError) => {
      onError?.(error)

      if (throwOnError) {
        handleQueryError(error, queryKey as string[])
      }
    },
    [onError, throwOnError, handleQueryError, queryKey]
  )

  return useQuery({
    queryKey,
    queryFn,
    onError: handleError as any,
    ...options,
  })
}
```

### Mutation Error Handler

```typescript
// lib/query/useMutationWithErrorHandler.ts

import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from '@tanstack/react-query'
import { AppError, getUserFriendlyMessage } from '@/lib/errors/AppError'
import { useCallback } from 'react'

interface UseMutationWithErrorHandlerOptions<TData, TError, TVariables>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>
  invalidateQueries?: string[][]
  onSuccess?: (data: TData) => void
  onError?: (error: TError) => void
}

export function useMutationWithErrorHandler<
  TData = unknown,
  TError = Error,
  TVariables = unknown
>({
  mutationFn,
  invalidateQueries,
  onSuccess,
  onError,
  ...options
}: UseMutationWithErrorHandlerOptions<TData, TError, TVariables>) {
  const queryClient = useQueryClient()

  const handleSuccess = useCallback(
    (data: TData) => {
      // Invalidate affected queries
      if (invalidateQueries) {
        invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey })
        })
      }

      onSuccess?.(data)
    },
    [onSuccess, invalidateQueries, queryClient]
  )

  const handleError = useCallback(
    (error: TError) => {
      const message = getUserFriendlyMessage(error as any)
      console.error('Mutation error:', message)
      onError?.(error)
    },
    [onError]
  )

  return useMutation({
    mutationFn,
    onSuccess: handleSuccess,
    onError: handleError,
    ...options,
  })
}
```

---

## 8. Form Error Handling

### Server Validation Error Mapping

```typescript
// lib/forms/serverValidationMapper.ts

import { FieldValues, UseFormSetError } from 'react-hook-form'
import { AppError } from '@/lib/errors/AppError'

interface ValidationError {
  field: string
  message: string
}

export function mapServerErrorsToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>
) {
  if (error instanceof AppError) {
    const { code, details, message } = error

    // Check if details contains field errors
    if (details?.errors && Array.isArray(details.errors)) {
      const validationErrors: ValidationError[] = details.errors
      validationErrors.forEach(({ field, message }) => {
        setError(field as any, {
          type: 'server',
          message,
        })
      })
      return
    }

    // Handle validation error code
    if (code === 'VALIDATION_ERROR' && details?.fieldErrors) {
      Object.entries(details.fieldErrors).forEach(([field, errors]) => {
        const fieldErrors = Array.isArray(errors) ? errors : [errors]
        setError(field as any, {
          type: 'server',
          message: fieldErrors[0] as string,
        })
      })
      return
    }

    // Fallback to generic error
    setError('root' as any, {
      type: 'server',
      message: message || 'Form submission failed',
    })
  } else {
    setError('root' as any, {
      type: 'server',
      message: 'An unexpected error occurred',
    })
  }
}
```

### Form Submission with Error Handling

```typescript
// lib/forms/useFormSubmit.ts

import { useCallback } from 'react'
import { FieldValues, UseFormHandleSubmit, UseFormSetError } from 'react-hook-form'
import { mapServerErrorsToForm } from './serverValidationMapper'
import { AppError, getUserFriendlyMessage } from '@/lib/errors/AppError'

interface UseFormSubmitOptions<T extends FieldValues> {
  onSubmit: (data: T) => Promise<any>
  onSuccess?: (data: any) => void
  setError: UseFormSetError<T>
  timeout?: number
}

export function useFormSubmit<T extends FieldValues>(
  options: UseFormSubmitOptions<T>
) {
  const { onSubmit, onSuccess, setError, timeout = 30000 } = options

  const handleFormSubmit = useCallback(
    async (data: T) => {
      try {
        // Clear previous errors
        setError('root' as any, { type: 'manual', message: '' })

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new AppError({
                  code: 'TIMEOUT_ERROR',
                  message: 'Request took too long',
                  statusCode: 408,
                  retryable: true,
                })
              ),
            timeout
          )
        )

        // Race against timeout
        const result = await Promise.race([
          onSubmit(data),
          timeoutPromise,
        ])

        onSuccess?.(result)
      } catch (error) {
        // Handle 409 Conflict with merge strategy
        if (
          error instanceof AppError &&
          error.code === 'CONFLICT'
        ) {
          setError('root' as any, {
            type: 'server',
            message: 'This resource was modified. Please refresh and try again.',
          })
        } else {
          mapServerErrorsToForm(error, setError)
        }

        throw error
      }
    },
    [onSubmit, onSuccess, setError, timeout]
  )

  return handleFormSubmit
}
```

### React Hook Form Error Display

```typescript
// components/forms/FormErrorMessage.tsx

import { FieldError } from 'react-hook-form'
import { AlertCircle } from 'lucide-react'

interface FormErrorMessageProps {
  error?: FieldError
  className?: string
}

export function FormErrorMessage({
  error,
  className = '',
}: FormErrorMessageProps) {
  if (!error) return null

  return (
    <div className={`flex items-center gap-2 text-sm text-destructive ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{error.message}</span>
    </div>
  )
}
```

### Form with Full Error Handling

```typescript
// components/forms/UserProfileForm.tsx

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@ordo/ui'
import { Input } from '@ordo/ui'
import { FormErrorMessage } from './FormErrorMessage'
import { useFormSubmit } from '@/lib/forms/useFormSubmit'
import { useMutationWithErrorHandler } from '@/lib/query/useMutationWithErrorHandler'
import { apiClient } from '@/lib/api/client'
import { useState } from 'react'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

type FormData = z.infer<typeof schema>

export function UserProfileForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const { mutateAsync } = useMutationWithErrorHandler({
    mutationFn: (data: FormData) =>
      apiClient.post('/users/profile', data),
    invalidateQueries: [['user', 'profile']],
  })

  const onSubmit = useFormSubmit({
    onSubmit: mutateAsync,
    setError,
    onSuccess: () => {
      // Show success toast
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <Input
          {...register('name')}
          placeholder="Your name"
          aria-invalid={!!errors.name}
        />
        <FormErrorMessage error={errors.name} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <Input
          {...register('email')}
          type="email"
          placeholder="your@email.com"
          aria-invalid={!!errors.email}
        />
        <FormErrorMessage error={errors.email} />
      </div>

      {errors.root && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded">
          {errors.root.message}
        </div>
      )}

      <Button type="submit">Save Changes</Button>
    </form>
  )
}
```

---

## 9. Offline Detection

### useOnlineStatus Hook

```typescript
// lib/hooks/useOnlineStatus.ts

import { useState, useEffect } from 'react'
import { useStore } from '@/stores/appStore'

interface OnlineStatusConfig {
  healthCheckUrl?: string
  healthCheckInterval?: number
  enableLogging?: boolean
}

export function useOnlineStatus(
  config: OnlineStatusConfig = {}
) {
  const {
    healthCheckUrl = '/api/health',
    healthCheckInterval = 30000,
    enableLogging = false,
  } = config

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [isChecking, setIsChecking] = useState(false)
  const setAppOnlineStatus = useStore((state) => state.setOnlineStatus)

  useEffect(() => {
    const handleOnline = () => {
      if (enableLogging) console.log('Online')
      setIsOnline(true)
      setAppOnlineStatus(true)
    }

    const handleOffline = () => {
      if (enableLogging) console.log('Offline')
      setIsOnline(false)
      setAppOnlineStatus(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setAppOnlineStatus, enableLogging])

  // Health check polling
  useEffect(() => {
    if (!isOnline) return

    const checkHealth = async () => {
      setIsChecking(true)
      try {
        const response = await fetch(healthCheckUrl, {
          method: 'HEAD',
          cache: 'no-cache',
        })
        if (!response.ok && response.status !== 204) {
          throw new Error('Health check failed')
        }
        setIsOnline(true)
        setAppOnlineStatus(true)
      } catch (error) {
        if (enableLogging) console.error('Health check failed:', error)
        setIsOnline(false)
        setAppOnlineStatus(false)
      } finally {
        setIsChecking(false)
      }
    }

    // Check immediately
    checkHealth()

    // Then set up polling
    const interval = setInterval(checkHealth, healthCheckInterval)

    return () => clearInterval(interval)
  }, [isOnline, healthCheckUrl, healthCheckInterval, setAppOnlineStatus, enableLogging])

  return {
    isOnline,
    isChecking,
  }
}
```

### OnlineStatusProvider Context

```typescript
// lib/providers/OnlineStatusProvider.tsx

'use client'

import React, { ReactNode, createContext, useContext } from 'react'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'

interface OnlineStatusContextType {
  isOnline: boolean
  isChecking: boolean
}

const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(
  undefined
)

interface OnlineStatusProviderProps {
  children: ReactNode
  healthCheckUrl?: string
  healthCheckInterval?: number
}

export function OnlineStatusProvider({
  children,
  healthCheckUrl,
  healthCheckInterval,
}: OnlineStatusProviderProps) {
  const { isOnline, isChecking } = useOnlineStatus({
    healthCheckUrl,
    healthCheckInterval,
  })

  return (
    <OnlineStatusContext.Provider value={{ isOnline, isChecking }}>
      {children}
    </OnlineStatusContext.Provider>
  )
}

export function useOnlineStatusContext() {
  const context = useContext(OnlineStatusContext)
  if (!context) {
    throw new Error(
      'useOnlineStatusContext must be used within OnlineStatusProvider'
    )
  }
  return context
}
```

### OfflineIndicator Banner Component

```typescript
// components/offline/OfflineIndicator.tsx

'use client'

import { useOnlineStatusContext } from '@/lib/providers/OnlineStatusProvider'
import { AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatusContext()
  const [show, setShow] = useState(!isOnline)

  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => setShow(false), 2000)
      return () => clearTimeout(timer)
    }
    setShow(true)
  }, [isOnline])

  if (show && isOnline) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-bottom-2">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Back online</span>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 p-3 flex items-center gap-2 shadow-md z-50">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm font-medium">
          You're offline. Some features are limited.
        </span>
      </div>
    )
  }

  return null
}
```

---

## 10. Offline Mutation Queue

### Offline Queue Store (Zustand)

```typescript
// stores/offlineQueueStore.ts

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface QueuedMutation {
  id: string
  endpoint: string
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
  timestamp: number
  retryCount: number
  maxRetries: number
}

interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge'
  timestamp: number
}

interface OfflineQueueState {
  queue: QueuedMutation[]
  isSyncing: boolean
  lastSyncTime: number | null
  syncErrors: Record<string, string>
  conflictResolutions: Record<string, ConflictResolution>

  // Actions
  addToQueue: (mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount'>) => void
  removeFromQueue: (id: string) => void
  updateMutation: (id: string, updates: Partial<QueuedMutation>) => void
  setIsSyncing: (syncing: boolean) => void
  setSyncError: (mutationId: string, error: string) => void
  clearSyncError: (mutationId: string) => void
  addConflictResolution: (
    mutationId: string,
    resolution: ConflictResolution
  ) => void
  clearQueue: () => void
  setLastSyncTime: (time: number) => void
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,
      lastSyncTime: null,
      syncErrors: {},
      conflictResolutions: {},

      addToQueue: (mutation) => {
        const id = `${Date.now()}-${Math.random()}`
        set((state) => ({
          queue: [
            ...state.queue,
            {
              ...mutation,
              id,
              timestamp: Date.now(),
              retryCount: 0,
              maxRetries: mutation.method === 'DELETE' ? 1 : 3,
            },
          ],
        }))
        return id
      },

      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter((m) => m.id !== id),
        }))
      },

      updateMutation: (id, updates) => {
        set((state) => ({
          queue: state.queue.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }))
      },

      setIsSyncing: (syncing) => {
        set({ isSyncing: syncing })
      },

      setSyncError: (mutationId, error) => {
        set((state) => ({
          syncErrors: {
            ...state.syncErrors,
            [mutationId]: error,
          },
        }))
      },

      clearSyncError: (mutationId) => {
        set((state) => {
          const { [mutationId]: _, ...rest } = state.syncErrors
          return { syncErrors: rest }
        })
      },

      addConflictResolution: (mutationId, resolution) => {
        set((state) => ({
          conflictResolutions: {
            ...state.conflictResolutions,
            [mutationId]: resolution,
          },
        }))
      },

      clearQueue: () => {
        set({
          queue: [],
          syncErrors: {},
          conflictResolutions: {},
          lastSyncTime: null,
        })
      },

      setLastSyncTime: (time) => {
        set({ lastSyncTime: time })
      },
    }),
    {
      name: 'offline-queue-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        queue: state.queue,
        conflictResolutions: state.conflictResolutions,
      }),
    }
  )
)
```

### Mutation Queue Processor

```typescript
// lib/offline/queueProcessor.ts

import { apiClient } from '@/lib/api/client'
import { useOfflineQueueStore } from '@/stores/offlineQueueStore'
import { captureException } from '@sentry/nextjs'

export class QueueProcessor {
  static async processMutation(mutation: any) {
    try {
      const response = await apiClient.request(mutation.endpoint, {
        method: mutation.method,
        body: mutation.body,
        headers: mutation.headers,
        retryable: mutation.method !== 'DELETE',
        timeout: 30000,
      })

      return response
    } catch (error) {
      throw error
    }
  }

  static async processQueue() {
    const queue = useOfflineQueueStore.getState().queue
    const setIsSyncing = useOfflineQueueStore.getState().setIsSyncing
    const updateMutation = useOfflineQueueStore.getState().updateMutation
    const removeFromQueue = useOfflineQueueStore.getState().removeFromQueue
    const setSyncError = useOfflineQueueStore.getState().setSyncError
    const clearSyncError = useOfflineQueueStore.getState().clearSyncError
    const setLastSyncTime = useOfflineQueueStore.getState().setLastSyncTime

    if (queue.length === 0 || useOfflineQueueStore.getState().isSyncing) {
      return
    }

    setIsSyncing(true)

    try {
      for (const mutation of queue) {
        try {
          await this.processMutation(mutation)
          clearSyncError(mutation.id)
          removeFromQueue(mutation.id)
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          updateMutation(mutation.id, {
            retryCount: mutation.retryCount + 1,
          })

          if (mutation.retryCount >= mutation.maxRetries) {
            setSyncError(mutation.id, err.message)
            captureException(err, {
              tags: { type: 'offline_queue_failed' },
              contexts: { mutation },
            })
          }
        }
      }
    } finally {
      setIsSyncing(false)
      setLastSyncTime(Date.now())
    }
  }
}
```

### Hook to Use Offline-Safe Mutations

```typescript
// lib/hooks/useOfflineMutation.ts

import { useCallback, useEffect } from 'react'
import { useOnlineStatusContext } from '@/lib/providers/OnlineStatusProvider'
import { useOfflineQueueStore } from '@/stores/offlineQueueStore'
import { QueueProcessor } from '@/lib/offline/queueProcessor'

interface UseOfflineMutationOptions {
  endpoint: string
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  headers?: Record<string, string>
}

export function useOfflineMutation(options: UseOfflineMutationOptions) {
  const { isOnline } = useOnlineStatusContext()
  const {
    addToQueue,
    updateMutation,
    removeFromQueue,
    setSyncError,
    clearSyncError,
  } = useOfflineQueueStore()

  const mutate = useCallback(
    async (body?: any) => {
      if (isOnline) {
        // Online: execute immediately
        try {
          const result = await fetch(options.endpoint, {
            method: options.method,
            body: JSON.stringify(body),
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
            },
          }).then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
          })

          options.onSuccess?.(result)
          return result
        } catch (error) {
          options.onError?.(error as Error)
          throw error
        }
      } else {
        // Offline: queue
        const mutationId = addToQueue({
          endpoint: options.endpoint,
          method: options.method,
          body,
          headers: options.headers,
          maxRetries: 3,
        })

        return { queued: true, mutationId }
      }
    },
    [isOnline, addToQueue, options]
  )

  // Retry queued mutations when coming online
  useEffect(() => {
    if (isOnline) {
      QueueProcessor.processQueue()
    }
  }, [isOnline])

  return {
    mutate,
    isOnline,
  }
}
```

---

## 11. Service Worker & PWA

### Next.js PWA Config (next.config.ts)

```typescript
// next.config.ts

import withPWA from 'next-pwa'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ... other config
}

const withPWAConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: false,
  customWorkerPrefix: 'worker',
  workboxOptions: {
    disableDevLogs: true,
  },
})

export default withPWAConfig(nextConfig)
```

### Workbox Configuration (public/workbox-config.js)

```javascript
// public/workbox-config.js

module.exports = {
  globDirectory: 'public/',
  globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
  globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
  swDest: 'public/sw.js',
  clientsClaim: true,
  skipWaiting: false,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.ordo\.app\/api\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/_next\/static\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/cdn\.example\.com\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'cdn-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    {
      urlPattern: /^https:\/\/api\.ordo\.app\/pages\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 10 * 60,
        },
      },
    },
  ],
}
```

### Service Worker Implementation

```typescript
// public/sw.ts (TypeScript, compiled to sw.js)

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('Service Worker installing')
  self.skipWaiting()
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('Service Worker activating')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Background sync for queued mutations
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      (async () => {
        try {
          // Notify client to process queue
          const clients = await self.clients.matchAll()
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_OFFLINE_QUEUE',
            })
          })
        } catch (error) {
          console.error('Sync failed:', error)
        }
      })()
    )
  }
})
```

### PWA Manifest (public/manifest.json)

```json
{
  "name": "Ordo Creator OS",
  "short_name": "Ordo",
  "description": "Creator platform for building and managing projects",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot-1.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshot-2.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "shortcuts": [
    {
      "name": "New Project",
      "short_name": "New Project",
      "description": "Create a new project",
      "url": "/projects/new",
      "icons": [{ "src": "/icon-shortcut.png", "sizes": "96x96" }]
    }
  ],
  "categories": ["productivity", "utilities"]
}
```

---

## 12. Mobile Offline (Expo)

### useOnlineStatus Hook for Expo

```typescript
// mobile/hooks/useOnlineStatusExpo.ts

import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

export function useOnlineStatusExpo() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<
    'wifi' | 'cellular' | 'unknown'
  >('unknown')

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected && state.isInternetReachable
      setIsOnline(isConnected ?? false)
      setConnectionType(
        state.type === 'wifi' || state.type === 'cellular'
          ? state.type
          : 'unknown'
      )
    })

    return () => unsubscribe()
  }, [])

  return { isOnline, connectionType }
}
```

### MMKV Local Cache for Expo

```typescript
// mobile/storage/mmkvCache.ts

import { MMKV } from 'react-native-mmkv'

const cache = new MMKV()

interface CacheOptions {
  ttl?: number // milliseconds
}

export const mmkvCache = {
  set: (key: string, value: any, options?: CacheOptions) => {
    const data = {
      value,
      timestamp: Date.now(),
      ttl: options?.ttl,
    }
    cache.setString(key, JSON.stringify(data))
  },

  get: <T = any>(key: string): T | null => {
    const data = cache.getString(key)
    if (!data) return null

    try {
      const parsed = JSON.parse(data)
      const { value, timestamp, ttl } = parsed

      // Check TTL
      if (ttl && Date.now() - timestamp > ttl) {
        cache.delete(key)
        return null
      }

      return value as T
    } catch {
      return null
    }
  },

  remove: (key: string) => {
    cache.delete(key)
  },

  clear: () => {
    cache.clearAll()
  },
}
```

### React Query Persistence for Expo

```typescript
// mobile/query/persistor.ts

import { PersistedClient, Persister } from '@tanstack/react-query-persist-client'
import { mmkvCache } from '@/mobile/storage/mmkvCache'

export const mmkvPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    mmkvCache.set('react-query-cache', client, { ttl: 24 * 60 * 60 * 1000 })
  },

  restoreClient: async () => {
    return mmkvCache.get('react-query-cache')
  },

  removeClient: async () => {
    mmkvCache.remove('react-query-cache')
  },
}
```

### Offline Queue for Mobile

```typescript
// mobile/offline/mobileOfflineQueue.ts

import { MMKV } from 'react-native-mmkv'
import { Mutex } from 'async-lock'

const queue = new MMKV()
const mutex = new Mutex()

interface MobileQueuedMutation {
  id: string
  endpoint: string
  method: string
  body: any
  timestamp: number
}

export const mobileOfflineQueue = {
  add: async (mutation: Omit<MobileQueuedMutation, 'id' | 'timestamp'>) => {
    return mutex.lock('queue', () => {
      const id = `${Date.now()}-${Math.random()}`
      const item = { ...mutation, id, timestamp: Date.now() }
      const existing = JSON.parse(queue.getString('mutations') || '[]')
      queue.setString('mutations', JSON.stringify([...existing, item]))
      return id
    })
  },

  getAll: async (): Promise<MobileQueuedMutation[]> => {
    return mutex.lock('queue', () => {
      return JSON.parse(queue.getString('mutations') || '[]')
    })
  },

  remove: async (id: string) => {
    return mutex.lock('queue', () => {
      const existing = JSON.parse(queue.getString('mutations') || '[]')
      queue.setString(
        'mutations',
        JSON.stringify(existing.filter((m: any) => m.id !== id))
      )
    })
  },

  clear: async () => {
    return mutex.lock('queue', () => {
      queue.delete('mutations')
    })
  },
}
```

---

## 13. Electron Error Handling

### Main Process Error Handler

```typescript
// electron/main.ts

import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import * as Sentry from '@sentry/electron'

// Initialize Sentry for Electron
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

// Handle uncaught exceptions in main process
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
  Sentry.captureException(error, {
    tags: { context: 'main-process' },
  })

  // Graceful shutdown
  app.quit()
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
  Sentry.captureException(new Error(String(reason)))
})

// Auto-update error handling
autoUpdater.on('error', (error) => {
  console.error('Auto-update error:', error)
  Sentry.captureException(error, {
    tags: { type: 'auto-update-error' },
  })
})

autoUpdater.on('update-not-available', () => {
  console.log('Update not available')
})

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

let mainWindow: BrowserWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      enableRemoteModule: false,
    },
  })

  mainWindow.webContents.on('crashed', () => {
    console.error('Renderer process crashed')
    Sentry.captureMessage('Renderer process crashed', 'error')
    mainWindow.reload()
  })

  mainWindow.webContents.on('unresponsive', () => {
    console.error('Renderer process unresponsive')
    Sentry.captureMessage('Renderer process unresponsive', 'warning')
  })

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../renderer/out/index.html')}`
  )
}

app.on('ready', createWindow)
```

### Renderer Process Error Handler

```typescript
// electron/renderer.ts

import * as Sentry from '@sentry/electron/renderer'
import { ErrorBoundaryWrapper } from '@/lib/errors/ErrorBoundaryWrapper'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Renderer error:', event.error)
  Sentry.captureException(event.error)
})

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason)
  Sentry.captureException(event.reason)
})
```

### Crash Reporter

```typescript
// electron/crashReporter.ts

import { crashReporter } from 'electron'

export function setupCrashReporter() {
  crashReporter.start({
    companyName: 'Ordo',
    productName: 'Ordo Creator OS',
    submitURL: process.env.CRASH_REPORT_URL || '',
    uploadToServer: true,
    ignoreSystemCrashHandler: false,
    rateLimit: false,
  })

  // Handle crash dumps
  if (process.platform === 'win32') {
    const { app } = require('electron')
    const pendingCrashReport = app.getPath('userData')
    // Process pending crash reports
  }
}
```

---

## 14. Graceful Degradation

### Feature Flags Store

```typescript
// stores/featureFlagsStore.ts

import { create } from 'zustand'

interface FeatureFlags {
  offlineMode: boolean
  backgroundSync: boolean
  advancedAnalytics: boolean
  betaFeatures: boolean
  maintenanceMode: boolean
}

interface FeatureFlagsState {
  flags: FeatureFlags
  setFlags: (flags: Partial<FeatureFlags>) => void
  isFeatureEnabled: (feature: keyof FeatureFlags) => boolean
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  flags: {
    offlineMode: true,
    backgroundSync: true,
    advancedAnalytics: false,
    betaFeatures: false,
    maintenanceMode: false,
  },

  setFlags: (newFlags) => {
    set((state) => ({
      flags: { ...state.flags, ...newFlags },
    }))
  },

  isFeatureEnabled: (feature) => {
    return get().flags[feature] === true
  },
}))
```

### Progressive Enhancement Checklist

```typescript
// lib/degradation/progressiveEnhancement.ts

interface EnhancementLevel {
  core: boolean
  enhanced: boolean
  advanced: boolean
}

export const featureEnhancements: Record<string, EnhancementLevel> = {
  projectList: {
    core: true, // List projects
    enhanced: true, // Sorting, filtering
    advanced: true, // Real-time updates
  },
  projectEditor: {
    core: true, // Basic editing
    enhanced: true, // Rich text formatting
    advanced: true, // Collaborative editing
  },
  analytics: {
    core: false, // Not essential
    enhanced: true, // Charts
    advanced: true, // ML predictions
  },
  fileSync: {
    core: true, // Basic storage
    enhanced: true, // Automatic sync
    advanced: true, // Conflict resolution
  },
}

export function getEnhancementLevel(
  feature: keyof typeof featureEnhancements
): 'core' | 'enhanced' | 'advanced' | null {
  const enhancement = featureEnhancements[feature]
  if (!enhancement) return null

  // Return highest available level
  if (enhancement.advanced) return 'advanced'
  if (enhancement.enhanced) return 'enhanced'
  if (enhancement.core) return 'core'

  return null
}
```

### Skeleton Loader Component

```typescript
// components/state/SkeletonLoader.tsx

interface SkeletonLoaderProps {
  count?: number
  className?: string
  variant?: 'text' | 'line' | 'circle' | 'rectangle'
}

export function SkeletonLoader({
  count = 1,
  className = 'h-4 bg-muted rounded',
  variant = 'text',
}: SkeletonLoaderProps) {
  const variants = {
    text: 'h-4 bg-muted rounded w-3/4',
    line: 'h-4 bg-muted rounded w-full',
    circle: 'h-10 w-10 bg-muted rounded-full',
    rectangle: 'h-20 w-full bg-muted rounded',
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${variants[variant]} animate-pulse`}
        />
      ))}
    </div>
  )
}
```

### Degraded Mode Component

```typescript
// components/degradation/DegradedModeIndicator.tsx

import { AlertCircle } from 'lucide-react'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'

export function DegradedModeIndicator() {
  const { flags } = useFeatureFlagsStore()

  if (!flags.maintenanceMode) return null

  return (
    <div className="fixed bottom-4 left-4 bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded flex items-center gap-2 z-40">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <div>
        <p className="font-medium">Limited Mode</p>
        <p className="text-sm">Some features are temporarily unavailable</p>
      </div>
    </div>
  )
}
```

---

## 15. Testing Error Scenarios

### Test Error Boundary with Vitest

```typescript
// __tests__/ErrorBoundary.test.tsx

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '@/lib/errors/ErrorBoundary'

// Suppress console errors for tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ErrorBoundary', () => {
  it('should catch errors and display fallback UI', () => {
    const TestComponent = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('should call reset function when retry button clicked', async () => {
    const user = userEvent.setup()
    let shouldError = true

    const TestComponent = () => {
      if (shouldError) throw new Error('Test error')
      return <div>Success</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    const retryButton = screen.getByRole('button', { name: /try again/i })
    shouldError = false

    await user.click(retryButton)
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('should call custom fallback', () => {
    const TestComponent = () => {
      throw new Error('Test error')
    }

    const customFallback = (error: Error, reset: () => void) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error.message}</p>
        <button onClick={reset}>Custom Retry</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={customFallback}>
        <TestComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom Error')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })
})
```

### Simulate Offline with MSW

```typescript
// __tests__/offline.test.tsx

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'

const server = setupServer(
  http.get('/api/health', () => {
    return HttpResponse.error()
  })
)

beforeEach(() => {
  server.listen()
})

describe('Offline Detection', () => {
  it('should detect offline status when health check fails', async () => {
    const TestComponent = () => {
      const { isOnline } = useOnlineStatus({
        healthCheckUrl: '/api/health',
      })

      return <div>{isOnline ? 'Online' : 'Offline'}</div>
    }

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
  })
})
```

### Test Retry Logic

```typescript
// __tests__/retry.test.ts

import { describe, it, expect, vi } from 'vitest'
import { retryWithBackoff } from '@/lib/api/retry'

describe('Retry Logic', () => {
  it('should retry failed requests with exponential backoff', async () => {
    let attempts = 0
    const fn = vi.fn(async () => {
      attempts++
      if (attempts < 3) throw new Error('Fail')
      return 'success'
    })

    const result = await retryWithBackoff(() => fn(), {
      maxAttempts: 3,
      initialDelayMs: 10,
    })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw after max attempts', async () => {
    const fn = vi.fn(async () => {
      throw new Error('Always fails')
    })

    await expect(
      retryWithBackoff(() => fn(), {
        maxAttempts: 2,
        initialDelayMs: 10,
      })
    ).rejects.toThrow()

    expect(fn).toHaveBeenCalledTimes(2)
  })
})
```

### Test Mutation Queue

```typescript
// __tests__/offlineQueue.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { useOfflineQueueStore } from '@/stores/offlineQueueStore'
import { QueuedMutation } from '@/stores/offlineQueueStore'

describe('Offline Queue', () => {
  beforeEach(() => {
    const store = useOfflineQueueStore.getState()
    store.clearQueue()
  })

  it('should add mutations to queue', () => {
    const store = useOfflineQueueStore.getState()

    store.addToQueue({
      endpoint: '/api/projects',
      method: 'POST',
      body: { name: 'New Project' },
    })

    expect(store.queue).toHaveLength(1)
    expect(store.queue[0].endpoint).toBe('/api/projects')
  })

  it('should remove mutations from queue', () => {
    const store = useOfflineQueueStore.getState()

    const id = store.addToQueue({
      endpoint: '/api/projects',
      method: 'POST',
      body: { name: 'New Project' },
    })

    store.removeFromQueue(id)

    expect(store.queue).toHaveLength(0)
  })
})
```

---

## 16. Implementation Checklist

Use this checklist when adding error handling to a new feature:

### Pre-Implementation
- [ ] Identify all error scenarios (validation, network, auth, business logic)
- [ ] Define user-friendly error messages
- [ ] Plan error boundaries hierarchy
- [ ] Design fallback UI components
- [ ] Plan offline support (if applicable)

### API Layer
- [ ] Create AppError subclass for domain-specific errors
- [ ] Implement error status mapping
- [ ] Add retry logic with exponential backoff
- [ ] Implement circuit breaker if critical
- [ ] Test HTTP error codes (4xx, 5xx, 0)

### React Layer
- [ ] Wrap component tree with ErrorBoundary
- [ ] Create error.tsx for route-level handling
- [ ] Implement useErrorBoundary hook
- [ ] Add Sentry error context
- [ ] Test error boundary captures errors

### Data Fetching
- [ ] Set up React Query queryClient with error config
- [ ] Implement per-query error handling
- [ ] Add onError callback to mutations
- [ ] Test query retry behavior
- [ ] Test mutation error recovery

### Form Handling
- [ ] Map server errors to form fields
- [ ] Handle timeout errors
- [ ] Handle conflict (409) responses
- [ ] Test validation error display
- [ ] Add loading state during submission

### Offline
- [ ] Integrate useOnlineStatus hook
- [ ] Add offline queue for mutations
- [ ] Persist queue to localStorage/MMKV
- [ ] Test mutation replay on reconnect
- [ ] Add OfflineIndicator component

### Testing
- [ ] Write error boundary tests
- [ ] Test error fallback UI
- [ ] Mock network errors with MSW
- [ ] Test offline behavior
- [ ] Test retry logic
- [ ] Test mutation queue persistence

### Monitoring
- [ ] Set up Sentry error tracking
- [ ] Add custom error context
- [ ] Add breadcrumbs for user actions
- [ ] Configure error grouping
- [ ] Test Sentry integration

### Deployment
- [ ] Test error handling in staging
- [ ] Verify Sentry receives errors
- [ ] Document error codes for support
- [ ] Set up error alerting/notifications
- [ ] Plan error rate monitoring

### Example Feature Implementation

For a new "Export Project" feature:

```typescript
// Step 1: Define errors
// lib/errors/exportErrors.ts
export class ExportError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super({
      code: 'SERVER_ERROR',
      message,
      statusCode,
      retryable: true,
    })
  }
}

// Step 2: API endpoint with error handling
// app/api/projects/[id]/export/route.ts
export async function POST(request: Request, { params }: any) {
  try {
    const projectId = params.id
    // ... export logic
    return Response.json({ url })
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json(
        { message: error.message },
        { status: 400 }
      )
    }
    return Response.json(
      { message: 'Export failed' },
      { status: 500 }
    )
  }
}

// Step 3: React component with offline support
// components/projects/ExportButton.tsx
'use client'

import { useState } from 'react'
import { useOfflineMutation } from '@/lib/hooks/useOfflineMutation'
import { Button } from '@ordo/ui'

export function ExportButton({ projectId }: { projectId: string }) {
  const { mutate, isOnline } = useOfflineMutation({
    endpoint: `/api/projects/${projectId}/export`,
    method: 'POST',
  })

  const handleExport = async () => {
    try {
      const result = await mutate({ format: 'pdf' })
      if (result.queued) {
        // Show queued message
      } else {
        // Download file
      }
    } catch (error) {
      // Error handled by boundary
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={!isOnline}
      title={!isOnline ? 'Offline - export queued' : ''}
    >
      Export
    </Button>
  )
}

// Step 4: Add error boundary
// components/projects/ExportFeature.tsx
export function ExportFeature({ projectId }: { projectId: string }) {
  return (
    <ErrorBoundary
      level="feature"
      fallback={(error, reset) => (
        <ErrorFallback
          error={error}
          resetErrorBoundary={reset}
          title="Export Failed"
          description="Unable to export project"
        />
      )}
    >
      <ExportButton projectId={projectId} />
    </ErrorBoundary>
  )
}
```

---

## Summary

This guide covers production-ready error handling and offline patterns for Ordo Creator OS across all platforms (Web, Mobile, Desktop). Key takeaways:

1. **Hierarchical Error Boundaries** — App, route, feature, component levels
2. **Centralized API Errors** — AppError class with retry, circuit breaker
3. **Offline-First Architecture** — Zustand queue, localStorage persist, reconnect sync
4. **Monitoring** — Sentry integration with custom context and breadcrumbs
5. **User Experience** — Fallback UI, graceful degradation, skeleton loaders
6. **Testing** — Vitest, MSW, error simulation
7. **All Platforms** — Web (Next.js), Mobile (Expo), Desktop (Electron)

Use the implementation checklist for every new feature to ensure comprehensive error handling.
