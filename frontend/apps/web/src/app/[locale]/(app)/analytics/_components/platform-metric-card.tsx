'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@ordo/ui';
import { Badge } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { PlatformMetrics } from '@ordo/types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface PlatformMetricCardProps {
  metrics: PlatformMetrics;
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-black',
  twitter: 'bg-sky-500',
  x: 'bg-sky-500',
  linkedin: 'bg-blue-600',
  facebook: 'bg-blue-500',
};

export function PlatformMetricCard({ metrics }: PlatformMetricCardProps) {
  const platformKey = metrics.platform.toLowerCase();
  const dotColor = PLATFORM_COLORS[platformKey] ?? 'bg-muted-foreground';
  const deltaPositive = metrics.followerDelta >= 0;
  const deltaAbs = Math.abs(metrics.followerDelta);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={cn('h-3 w-3 rounded-full', dotColor)} />
          <CardTitle className="text-base font-semibold capitalize">
            {metrics.platform}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Primary metric */}
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold">{formatNumber(metrics.views)}</p>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>
          <Badge
            variant={deltaPositive ? 'success' : 'destructive'}
            className="flex items-center gap-1"
          >
            {deltaPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {deltaPositive ? '+' : '-'}{formatNumber(deltaAbs)} followers
          </Badge>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-2 border-t pt-3">
          <div className="text-center">
            <p className="text-sm font-semibold">{formatNumber(metrics.likes)}</p>
            <p className="text-xs text-muted-foreground">Likes</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">{formatNumber(metrics.comments)}</p>
            <p className="text-xs text-muted-foreground">Comments</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">{formatNumber(metrics.shares)}</p>
            <p className="text-xs text-muted-foreground">Shares</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
