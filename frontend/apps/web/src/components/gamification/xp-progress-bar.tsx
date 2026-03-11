import * as React from 'react';
import { cn } from '@ordo/core';
import type { CreatorLevel } from '@ordo/types';

interface XpProgressBarProps {
  level: CreatorLevel;
  className?: string;
}

export function XpProgressBar({ level, className }: XpProgressBarProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{level.xp.toLocaleString()} XP</span>
        <span>{level.xpForNextLevel.toLocaleString()} XP</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${level.xpProgress}%` }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {level.xpForNextLevel - level.xp} XP to next level
      </p>
    </div>
  );
}
