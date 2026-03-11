'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Button } from '@ordo/ui';
import { X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUsage, useSubscription } from '@/hooks/use-billing';
import { TIER_LIMITS } from '@ordo/types';

function getDismissKey() {
  const now = new Date();
  return `upgrade-banner-dismissed-${now.getFullYear()}-${now.getMonth()}`;
}

export function UpgradeBanner({ className }: { className?: string }) {
  const [dismissed, setDismissed] = React.useState(false);
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  const { data: subscription } = useSubscription();
  const { data: usage } = useUsage();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = getDismissKey();
      setDismissed(localStorage.getItem(key) === 'true');
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(getDismissKey(), 'true');
    }
  }

  const tier = subscription?.tier ?? 'free';
  const limits = TIER_LIMITS[tier];
  const isPastDue = subscription?.status === 'past_due';

  const ideasPct =
    limits.ideas !== null && usage
      ? (usage.ideasThisMonth / limits.ideas) * 100
      : 0;

  const showBanner =
    !dismissed && (isPastDue || (tier === 'free' && ideasPct > 80));

  if (!showBanner) return null;

  const message = isPastDue
    ? 'Your payment is past due. Update your billing info to keep access.'
    : `You've used ${usage?.ideasThisMonth ?? 0}/${limits.ideas} ideas this month. Upgrade to Pro for unlimited.`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'sticky top-0 z-40 flex items-center gap-3 px-4 py-2.5 text-sm',
        isPastDue
          ? 'bg-red-600 text-white'
          : 'bg-amber-500 text-amber-950',
        className,
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      <Button
        size="sm"
        variant="secondary"
        asChild
        className="shrink-0 text-xs"
      >
        <Link href={`/${locale}/settings/billing`}>Upgrade</Link>
      </Button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="ml-1 rounded p-0.5 opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
