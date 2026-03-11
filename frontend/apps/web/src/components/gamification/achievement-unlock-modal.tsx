'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@ordo/ui';
import { cn } from '@ordo/core';
import { RARITY_RING } from './rarity-styles';
import type { Achievement } from '@ordo/types';

interface AchievementUnlockModalProps {
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementUnlockModal({ achievement, onClose }: AchievementUnlockModalProps) {
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex flex-col items-center gap-4 rounded-2xl border bg-background p-8 shadow-2xl text-center max-w-sm w-full mx-4 animate-in zoom-in-90">
        <p className="text-4xl">✨</p>
        <h2 className="text-xl font-bold">Achievement Unlocked!</h2>

        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full bg-background text-3xl',
            RARITY_RING[achievement.rarity],
          )}
        >
          {achievement.icon}
        </div>

        <div>
          <p className="font-semibold text-lg">{achievement.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{achievement.description}</p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">{achievement.rarity}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Dismiss
          </Button>
          <Button asChild onClick={onClose}>
            <Link href={`/${locale}/profile`}>View achievements</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
