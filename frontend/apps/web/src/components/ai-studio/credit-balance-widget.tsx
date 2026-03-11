'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ordo/ui';
import { cn } from '@ordo/core';
import { useAiCredits } from '@/hooks/use-ai-credits';

export function CreditBalanceWidget() {
  const { data: credits, isLoading } = useAiCredits();
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  if (isLoading) {
    return (
      <div className="px-3 py-2">
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!credits) return null;

  const pct = Math.min((credits.used / credits.limit) * 100, 100);
  const color =
    pct > 90
      ? 'bg-destructive'
      : pct > 70
        ? 'bg-yellow-500'
        : 'bg-green-500';

  const textColor =
    pct > 90
      ? 'text-destructive'
      : pct > 70
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-green-600 dark:text-green-400';

  const resetDate = new Date(credits.reset_date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="px-3 py-2 space-y-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="space-y-1 cursor-default">
              <div className="flex items-center justify-between">
                <span className={cn('text-xs font-medium', textColor)}>
                  {credits.used.toLocaleString()} / {credits.limit.toLocaleString()} credits
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Resets on {resetDate}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {credits.is_free_tier && (
        <Link
          href={`/${locale}/settings/billing`}
          className="block text-center text-xs font-medium text-primary hover:underline"
        >
          Upgrade for more credits
        </Link>
      )}
    </div>
  );
}
