import * as React from 'react';
import { cn } from '@ordo/core';
import { RARITY_RING } from './rarity-styles';
import type { Achievement } from '@ordo/types';

interface AchievementBadgeProps {
  achievement: Achievement;
}

export function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const isLocked = achievement.unlockedAt === null;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-colors hover:bg-muted',
        isLocked && 'opacity-40 grayscale',
      )}
      title={isLocked ? 'Locked' : `${achievement.title}: ${achievement.description}`}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full bg-background text-2xl',
          RARITY_RING[achievement.rarity],
        )}
      >
        {isLocked ? '???' : achievement.icon}
      </div>
      <p className="text-xs font-semibold leading-tight">
        {isLocked ? '???' : achievement.title}
      </p>
      <p className="text-[10px] capitalize text-muted-foreground">{achievement.rarity}</p>
    </div>
  );
}
