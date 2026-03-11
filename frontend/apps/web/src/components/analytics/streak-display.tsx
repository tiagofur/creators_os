import * as React from 'react';
import { Flame } from 'lucide-react';
import { Card, CardContent } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { ConsistencyScore } from '@ordo/types';

function getMotivationalMessage(streak: number): string {
  if (streak === 0) return 'Start your streak today!';
  if (streak < 3) return 'Great start! Keep it going.';
  if (streak < 7) return "You're building momentum!";
  if (streak < 14) return 'One week strong — impressive!';
  if (streak < 30) return "You're on fire! Keep it up.";
  if (streak < 60) return 'Elite consistency. Incredible!';
  return 'Legendary streak. You are unstoppable.';
}

interface StreakDisplayProps {
  data: Pick<ConsistencyScore, 'streak' | 'longestStreak'>;
}

export function StreakDisplay({ data }: StreakDisplayProps) {
  const flameColor =
    data.streak >= 7
      ? 'text-orange-500'
      : data.streak >= 3
        ? 'text-yellow-500'
        : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="flex flex-col items-center py-8">
        <Flame className={cn('mb-2 h-10 w-10', flameColor)} />
        <p className="text-5xl font-bold">{data.streak}</p>
        <p className="mt-1 text-sm text-muted-foreground">day streak</p>

        <p className="mt-4 text-sm text-muted-foreground">
          Best: <span className="font-semibold text-foreground">{data.longestStreak} days</span>
        </p>

        <p className="mt-3 text-center text-sm italic text-muted-foreground">
          {getMotivationalMessage(data.streak)}
        </p>
      </CardContent>
    </Card>
  );
}
