'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@ordo/ui';
import { PartyPopper } from 'lucide-react';
import { BILLING_KEYS } from '@/hooks/use-billing';
import { useSubscription } from '@/hooks/use-billing';

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = searchParams.get('session_id');

  // Invalidate subscription data so the UI reflects the new plan
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: BILLING_KEYS.subscription() });
    queryClient.invalidateQueries({ queryKey: BILLING_KEYS.usage() });
  }, [queryClient]);

  const { data: subscription } = useSubscription();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <PartyPopper className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>

      <h1 className="text-3xl font-bold">Welcome to {subscription ? subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1) : 'Pro'}!</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Your subscription is now active. You now have access to all the features included in your plan.
      </p>

      {sessionId && (
        <p className="mt-2 text-xs text-muted-foreground">
          Session: {sessionId.slice(0, 12)}...
        </p>
      )}

      <div className="mt-8 flex gap-3">
        <Button onClick={() => router.push('/')} size="lg">
          Start creating
        </Button>
        <Button variant="outline" onClick={() => router.push('/settings/billing')} size="lg">
          View billing
        </Button>
      </div>
    </div>
  );
}
