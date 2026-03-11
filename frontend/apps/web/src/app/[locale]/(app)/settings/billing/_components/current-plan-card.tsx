'use client';

import { cn } from '@ordo/core';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ordo/ui';
import { AlertTriangle } from 'lucide-react';
import { useSubscription, useCreatePortalSession, useReactivateSubscription } from '@/hooks/use-billing';
import type { SubscriptionStatus, SubscriptionTier } from '@ordo/types';

function tierColor(tier: SubscriptionTier) {
  if (tier === 'pro') return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
  if (tier === 'enterprise') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-muted text-muted-foreground';
}

function statusColor(status: SubscriptionStatus) {
  if (status === 'active' || status === 'trialing') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (status === 'past_due') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-muted text-muted-foreground';
}

function statusLabel(status: SubscriptionStatus) {
  const labels: Record<SubscriptionStatus, string> = {
    active: 'Active',
    trialing: 'Trialing',
    past_due: 'Past Due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
  };
  return labels[status];
}

export function CurrentPlanCard() {
  const { data: subscription, isLoading } = useSubscription();
  const portalMutation = useCreatePortalSession();
  const reactivateMutation = useReactivateSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) return null;

  const cancelDate = subscription.cancelAtPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription.cancelAtPeriodEnd && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Your plan cancels on {cancelDate}. Reactivate to keep access.</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize',
              tierColor(subscription.tier),
            )}
          >
            {subscription.tier}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
              statusColor(subscription.status),
            )}
          >
            {statusLabel(subscription.status)}
          </span>
        </div>

        <div className="text-sm text-muted-foreground">
          {subscription.cancelAtPeriodEnd ? (
            <p>Cancels on {cancelDate}</p>
          ) : (
            <p>
              Next billing date:{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
          {subscription.trialEnd && (
            <p>
              Trial ends:{' '}
              {new Date(subscription.trialEnd).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => portalMutation.mutate()}
            loading={portalMutation.isPending}
          >
            Manage billing
          </Button>
          {subscription.cancelAtPeriodEnd && (
            <Button
              size="sm"
              onClick={() => reactivateMutation.mutate()}
              loading={reactivateMutation.isPending}
            >
              Reactivate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
