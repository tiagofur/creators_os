'use client';

import { useSubscription, useUsage } from '@/hooks/use-billing';
import { TIER_LIMITS } from '@ordo/types';
import type { SubscriptionTier } from '@ordo/types';

export type Tier = SubscriptionTier;

export interface TierLimits {
  ideas: number | null;
  workspaces: number | null;
  aiCredits: number | null;
  teamMembers: number | null;
}

export function useTier() {
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsage();

  const tier: Tier = subscription?.tier ?? 'free';
  const limits = TIER_LIMITS[tier];

  function canUse(feature: keyof TierLimits): boolean {
    const limit = limits[feature];
    if (limit === null) return true; // unlimited

    if (usage) {
      const used: Record<keyof TierLimits, number> = {
        ideas: usage.ideasThisMonth,
        workspaces: usage.workspacesCount,
        aiCredits: usage.aiCreditsUsed,
        teamMembers: usage.teamMembersCount,
      };
      return used[feature] < limit;
    }

    // If usage data isn't loaded yet, allow access (optimistic)
    return limit > 0;
  }

  return {
    tier,
    limits,
    canUse,
    usage,
    subscription,
  };
}
