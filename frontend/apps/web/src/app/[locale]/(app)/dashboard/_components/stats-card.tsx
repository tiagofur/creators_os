'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@ordo/core';
import { Card, CardContent } from '@ordo/ui';

interface StatsCardProps {
  label: string;
  value: string | number;
  delta?: number; // percentage change, e.g. 12.5 means +12.5%
  icon?: React.ReactNode;
  className?: string;
}

export function StatsCard({ label, value, delta, icon, className }: StatsCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  const isNeutral = delta === 0;

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          </div>
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {icon}
            </div>
          )}
        </div>

        {delta !== undefined && (
          <div
            className={cn(
              'mt-3 flex items-center gap-1 text-xs font-medium',
              isPositive && 'text-green-600 dark:text-green-400',
              isNegative && 'text-red-600 dark:text-red-400',
              isNeutral && 'text-muted-foreground',
            )}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            {isNeutral && <Minus className="h-3 w-3" />}
            <span>
              {isPositive ? '+' : ''}
              {delta.toFixed(1)}% vs last period
            </span>
          </div>
        )}

        {/* Sparkline placeholder */}
        <div
          className="mt-3 h-8 w-full rounded-sm bg-muted/50"
          aria-hidden="true"
          title="Sparkline trend (coming soon)"
        />
      </CardContent>
    </Card>
  );
}
