'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@ordo/ui';
import { ShieldCheck } from 'lucide-react';

export default function BillingCanceledPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
      </div>

      <h1 className="text-2xl font-bold">No worries</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        You&apos;re still on the Free plan. You can upgrade any time from your billing settings.
      </p>

      <div className="mt-8 flex gap-3">
        <Button onClick={() => router.push('/settings/billing')} size="lg">
          Back to billing
        </Button>
        <Button variant="outline" onClick={() => router.push('/')} size="lg">
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
