'use client';

import { useEffect } from 'react';
import { Button } from '@ordo/ui';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Page Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="mt-2 text-muted-foreground">
          An unexpected error occurred. We&apos;ve been notified and are looking into it.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-3 max-w-md overflow-auto rounded bg-muted p-3 text-left text-xs">
            {error.message}
            {error.stack && '\n\n' + error.stack}
          </pre>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
