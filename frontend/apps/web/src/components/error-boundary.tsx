'use client';

import * as React from 'react';
import { Button } from '@ordo/ui';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);

    // Report to Sentry if configured
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__SENTRY__) {
      // Sentry.captureException(error, { extra: info });
    }

    console.error('[ErrorBoundary]', error, info);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="font-semibold">Something went wrong</h3>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-2 max-w-sm overflow-auto rounded bg-muted p-2 text-left text-xs">
              {this.state.error.message}
            </pre>
          )}
          <Button
            size="sm"
            className="mt-4"
            onClick={() => this.reset()}
          >
            Try again
          </Button>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}
