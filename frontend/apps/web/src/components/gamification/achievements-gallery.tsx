'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { AchievementBadge } from './achievement-badge';
import type { Achievement } from '@ordo/types';

const CATEGORIES: Array<{ label: string; value: Achievement['category'] | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Consistency', value: 'consistency' },
  { label: 'Ideas', value: 'ideas' },
  { label: 'Publishing', value: 'publishing' },
  { label: 'AI', value: 'ai' },
  { label: 'Social', value: 'social' },
];

interface AchievementsGalleryProps {
  achievements: Achievement[];
}

export function AchievementsGallery({ achievements }: AchievementsGalleryProps) {
  const [activeCategory, setActiveCategory] = React.useState<
    Achievement['category'] | 'all'
  >('all');

  const filtered =
    activeCategory === 'all'
      ? achievements
      : achievements.filter((a) => a.category === activeCategory);

  const unlocked = filtered.filter((a) => a.unlockedAt !== null).length;

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
              activeCategory === cat.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted bg-background text-muted-foreground hover:border-primary/50',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {unlocked} / {filtered.length} unlocked
      </p>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No achievements in this category yet.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {filtered.map((a) => (
            <AchievementBadge key={a.id} achievement={a} />
          ))}
        </div>
      )}
    </div>
  );
}
