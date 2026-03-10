# Error Boundaries & Offline-First Architecture
**Ordo Creator OS** — Frontend Error Handling & Resilience

**Status**: Draft  
**Version**: 1.0  
**Last Updated**: 2026-03-10  
**Tech Stack**: Next.js 15 App Router, React 19, TypeScript, Zustand, React Query v5, Sentry, Expo, Electron

---

## 1. Error Boundary Architecture

### 1.1 Hierarchy & Scope

Error boundaries are arranged in a nested hierarchy to handle errors at the most appropriate level:

```
Global Error Boundary (App Router: global-error.tsx)
└── Layout Error Boundary (root/layout error.tsx)
    ├── Dashboard Route Error (dashboard/error.tsx)
    │   ├── Feature Error Boundary (Zustand)
    │   │   └── Component Error Boundary
    │   └── Widget Error Boundary
    ├── Settings Route Error
    │   └── Form Error Boundary
    └── Creator Studio Route Error
        ├── Canvas Error Boundary
        └── Preview Error Boundary
```

### 1.2 Strategy

- **Global**: Catches unhandled errors, serves fallback UI, initiates error reporting
- **Route-level**: Catches navigation & data-fetching errors, provides context-aware recovery
- **Feature-level**: Catches business logic errors, offers feature-specific fallbacks
- **Component-level**: Catches rendering errors in isolated components, prevents full page crash

---

## 2. React Error Boundary Implementation

### 2.1 Class Component with Hooks Integration

```typescript
// lib/error-boundaries/ErrorBoundary.tsx
import React, { ReactNode, ErrorInfo } from 'react';
import { captureException } from '@sentry/nextjs';
import { ErrorFallback, ErrorFallbackProps } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  scope?: string;
  isolate?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = `EB-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.setState({ error, errorInfo, errorId });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    captureException(error, {
      contexts: {
        react: { componentStack: errorInfo.componentStack },
      },
      tags: {
        'error-boundary': this.props.scope || 'unknown',
        isolate: this.props.isolate ? 'true' : 'false',
      },
      level: 'error',
      extra: { errorId, errorBoundaryScope: this.props.scope },
    });

    if (process.env.NODE_ENV === 'development') {
      console.error(`[ErrorBoundary:${this.props.scope}]`, error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      !arraysEqual(this.props.resetKeys, prevProps.resetKeys)
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || ErrorFallback;
      return (
        <Fallback
          error={this.state.error!}
          resetError={this.resetErrorBoundary}
          errorId={this.state.errorId}
          scope={this.props.scope}
        />
      );
    }

    return this.props.children;
  }
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}
```

---

## 3. Next.js error.tsx Implementation

```typescript
// app/dashboard/error.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();
  const [retryCount, setRetryCount] = React.useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Error
        </h1>
        <p className="text-gray-600 text-center mb-4">
          An error occurred. Our team has been notified.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-xs font-mono text-red-800">{error.message}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => {
              setRetryCount((c) => c + 1);
              reset();
            }}
            className="flex-1 bg-blue-600 text-white py-2 rounded"
          >
            Retry ({retryCount})
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-gray-300 text-gray-900 py-2 rounded"
          >
            Home
          </button>
        </div>

        {error.digest && (
          <p className="text-xs text-gray-500 text-center mt-4">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## 4. API Error Handling with Retry Logic

```typescript
// lib/api/api-client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as Sentry from '@sentry/nextjs';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private axiosInstance: AxiosInstance;
  private retryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
  };

  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleError(error)
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    const statusCode = error.response?.status || 0;
    const data = error.response?.data as any;

    const apiError = new ApiError(
      statusCode,
      data?.code || 'UNKNOWN_ERROR',
      data?.message || error.message,
      data?.details
    );

    Sentry.captureException(apiError, {
      tags: { 'error-type': 'api' },
      contexts: { api: { statusCode, endpoint: error.config?.url } },
    });

    return Promise.reject(apiError);
  }

  async request<T = any>(
    method: string,
    url: string,
    config?: any
  ): Promise<T> {
    return this.retryRequest(() =>
      this.axiosInstance.request({ method, url, ...config })
    ).then((response) => response.data);
  }

  private async retryRequest<T>(
    fn: () => Promise<any>,
    attempt: number = 0
  ): Promise<any> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= this.retryConfig.maxRetries) throw error;

      const isRetryable =
        !error.response ||
        [408, 429, 500, 502, 503, 504].includes(error.response?.status);

      if (!isRetryable) throw error;

      const delay =
        this.retryConfig.initialDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.retryRequest(fn, attempt + 1);
    }
  }

  get<T = any>(url: string, config?: any) {
    return this.request<T>('GET', url, config);
  }

  post<T = any>(url: string, data?: any, config?: any) {
    return this.request<T>('POST', url, { ...config, data });
  }

  put<T = any>(url: string, data?: any, config?: any) {
    return this.request<T>('PUT', url, { ...config, data });
  }

  patch<T = any>(url: string, data?: any, config?: any) {
    return this.request<T>('PATCH', url, { ...config, data });
  }

  delete<T = any>(url: string, config?: any) {
    return this.request<T>('DELETE', url, config);
  }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_URL || '');
```

---

## 5. Offline Detection Hook

```typescript
// lib/hooks/useOnlineStatus.ts
import { useEffect, useState, useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';

export function useOnlineStatus(healthCheckUrl?: string) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isHealthy, setIsHealthy] = useState(true);

  const checkHealth = useCallback(async () => {
    if (!healthCheckUrl) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthCheckUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      setIsHealthy(response.ok);
    } catch (error) {
      setIsHealthy(false);
      Sentry.captureMessage('Health check failed', { level: 'warning' });
    }
  }, [healthCheckUrl]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkHealth();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkHealth]);

  return { isOnline, isHealthy, isFullyOnline: isOnline && isHealthy };
}
```

---

## 6. Offline Queue Management

```typescript
// lib/offline/offline-queue.ts
import { create } from 'zustand';

export interface QueuedMutation {
  id: string;
  timestamp: number;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: any;
  retries: number;
}

interface OfflineQueueStore {
  queue: QueuedMutation[];
  addToQueue: (mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
}

export const useOfflineQueue = create<OfflineQueueStore>((set) => ({
  queue: [],

  addToQueue: (mutation) => {
    const newMutation: QueuedMutation = {
      ...mutation,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retries: 0,
    };
    set((state) => ({
      queue: [...state.queue, newMutation],
    }));
  },

  removeFromQueue: (id) => {
    set((state) => ({
      queue: state.queue.filter((m) => m.id !== id),
    }));
  },

  clearQueue: () => {
    set({ queue: [] });
  },
}));
```

---

## Implementation Checklist

- [ ] Set up global-error.tsx for app-level error handling
- [ ] Create per-route error.tsx files
- [ ] Initialize and configure Sentry
- [ ] Implement APIClient with retry logic
- [ ] Set up React Query error handling
- [ ] Create offline detection with useOnlineStatus
- [ ] Implement offline queue with Zustand
- [ ] Add graceful degradation with feature flags
- [ ] Create comprehensive error tests
- [ ] Document error handling procedures

**Status**: Ready for implementation
