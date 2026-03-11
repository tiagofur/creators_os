'use client';

import { cn } from '@ordo/core';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@ordo/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUsage } from '@/hooks/use-billing';
import { useSubscription } from '@/hooks/use-billing';
import { TIER_LIMITS } from '@ordo/types';

interface MeterProps {
  label: string;
  used: number;
  limit: number | null;
}

function UsageMeter({ label, used, limit }: MeterProps) {
  const pct = limit === null ? 0 : Math.min((used / limit) * 100, 100);
  const barColor =
    pct > 90
      ? 'bg-red-500'
      : pct > 70
        ? 'bg-amber-500'
        : 'bg-green-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used} / {limit === null ? '∞' : limit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        {limit !== null && (
          <div
            className={cn('h-2 rounded-full transition-all', barColor)}
            style={{ width: `${pct}%` }}
          />
        )}
        {limit === null && (
          <div className="h-2 w-full rounded-full bg-green-500/30" />
        )}
      </div>
    </div>
  );
}

export function UsageMeters() {
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: subscription } = useSubscription();
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  const tier = subscription?.tier ?? 'free';
  const limits = TIER_LIMITS[tier];

  const approaching =
    usage &&
    limits.ideas !== null &&
    usage.ideasThisMonth / limits.ideas > 0.8;

  if (usageLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-2 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage this month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsageMeter
          label="Ideas"
          used={usage?.ideasThisMonth ?? 0}
          limit={limits.ideas}
        />
        <UsageMeter
          label="AI Credits"
          used={usage?.aiCreditsUsed ?? 0}
          limit={limits.aiCredits}
        />
        <UsageMeter
          label="Workspaces"
          used={usage?.workspacesCount ?? 0}
          limit={limits.workspaces}
        />
        <UsageMeter
          label="Team members"
          used={usage?.teamMembersCount ?? 0}
          limit={limits.teamMembers}
        />
        {approaching && tier === 'free' && (
          <div className="pt-2">
            <Button size="sm" asChild>
              <Link href={`/${locale}/settings/billing`}>Upgrade to Pro</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
