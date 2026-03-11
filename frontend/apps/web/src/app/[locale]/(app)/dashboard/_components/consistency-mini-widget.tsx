'use client';

import { Flame } from 'lucide-react';
import { Card, CardContent } from '@ordo/ui';
import { cn } from '@ordo/core';

interface ConsistencyMiniWidgetProps {
  streak?: number;
  className?: string;
}

export function ConsistencyMiniWidget({
  streak = 0,
  className,
}: ConsistencyMiniWidgetProps) {
  const getMessage = () => {
    if (streak === 0) return 'Start your streak today!';
    if (streak < 3) return 'Off to a good start!';
    if (streak < 7) return 'Keep it up!';
    if (streak < 30) return `${streak} days strong. Amazing!`;
    return `${streak} days — you're on fire!`;
  };

  return (
    <Card className={cn('', className)}>
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            streak > 0
              ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Flame className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {streak}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              day{streak !== 1 ? 's' : ''} streak
            </span>
          </p>
          <p className="text-sm text-muted-foreground">{getMessage()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
