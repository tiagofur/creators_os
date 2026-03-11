'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@ordo/ui';
import { Check } from 'lucide-react';
import { useSubscription, useCreateCheckoutSession } from '@/hooks/use-billing';
import { TIER_PRICES } from '@ordo/types';
import type { SubscriptionTier } from '@ordo/types';
import type { BillingPeriod } from '@ordo/api-client';

const PLAN_FEATURES: Record<SubscriptionTier, string[]> = {
  free: [
    'Up to 50 ideas / month',
    '1 workspace',
    'Basic content pipeline',
    'Community support',
    '0 AI credits',
  ],
  pro: [
    'Unlimited ideas',
    'Up to 3 workspaces',
    'Full pipeline + series',
    '500 AI credits / month',
    'Analytics & consistency tracker',
    'Sponsorship CRM',
    'Priority support',
  ],
  enterprise: [
    'Unlimited everything',
    'Unlimited team members',
    'Custom integrations',
    'Dedicated account manager',
    'SLA guarantee',
    'Custom AI credit packages',
  ],
};

export function PlanSelector() {
  const [period, setPeriod] = React.useState<BillingPeriod>('monthly');
  const { data: subscription } = useSubscription();
  const checkoutMutation = useCreateCheckoutSession();

  const currentTier = subscription?.tier ?? 'free';

  function handleUpgrade(tier: SubscriptionTier) {
    if (tier === 'enterprise') {
      window.location.href = 'mailto:sales@ordo.app';
      return;
    }
    checkoutMutation.mutate({ tier, billingPeriod: period });
  }

  function cta(tier: SubscriptionTier) {
    if (tier === 'enterprise') return 'Contact sales';
    if (tier === currentTier) return 'Current plan';
    const tiers: SubscriptionTier[] = ['free', 'pro', 'enterprise'];
    return tiers.indexOf(tier) > tiers.indexOf(currentTier) ? 'Upgrade' : 'Downgrade';
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Choose a plan</CardTitle>
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <button
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                period === 'monthly'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                period === 'annual'
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setPeriod('annual')}
            >
              Annual
              <Badge variant="secondary" className="text-xs">Save 33%</Badge>
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {(['free', 'pro', 'enterprise'] as SubscriptionTier[]).map((tier) => {
            const price = TIER_PRICES[tier];
            const isCurrentTier = tier === currentTier;
            const displayPrice = period === 'monthly' ? price.monthly : Math.round(price.annual / 12);

            return (
              <div
                key={tier}
                className={cn(
                  'flex flex-col rounded-lg border p-5 transition-colors',
                  isCurrentTier
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:border-muted-foreground/30',
                  tier === 'pro' && !isCurrentTier && 'border-violet-300 dark:border-violet-700',
                )}
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold capitalize">{tier}</h3>
                    {isCurrentTier && (
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    )}
                    {tier === 'pro' && !isCurrentTier && (
                      <Badge className="text-xs">Most popular</Badge>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    {tier === 'enterprise' ? (
                      <span className="text-2xl font-bold">Custom</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold">${displayPrice}</span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </>
                    )}
                  </div>
                  {period === 'annual' && tier !== 'free' && tier !== 'enterprise' && (
                    <p className="text-xs text-muted-foreground">
                      billed ${price.annual}/year
                    </p>
                  )}
                </div>

                <ul className="mb-6 flex-1 space-y-2">
                  {PLAN_FEATURES[tier].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrentTier ? 'outline' : tier === 'pro' ? 'primary' : 'outline'}
                  size="sm"
                  className="w-full"
                  disabled={isCurrentTier}
                  loading={checkoutMutation.isPending && checkoutMutation.variables?.tier === tier}
                  onClick={() => handleUpgrade(tier)}
                >
                  {cta(tier)}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
