'use client';

import * as React from 'react';
import { useGamificationProfile, useAchievements } from '@/hooks/use-gamification';
import { CreatorLevelCard } from '@/components/gamification/creator-level-card';
import { AchievementsGallery } from '@/components/gamification/achievements-gallery';

export default function ProfilePage() {
  const { data: profile, isLoading: profileLoading } = useGamificationProfile();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();

  return (
    <main className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Creator Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your XP, level, and achievements.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-8">
        {/* Level card */}
        <section>
          {profileLoading ? (
            <div className="mx-auto h-72 max-w-sm animate-pulse rounded-lg bg-muted" />
          ) : profile ? (
            <div className="mx-auto max-w-sm">
              <CreatorLevelCard profile={profile} />
            </div>
          ) : null}
        </section>

        {/* Achievements */}
        <section>
          <h2 className="mb-4 text-base font-semibold">Achievements</h2>
          {achievementsLoading ? (
            <div className="h-40 animate-pulse rounded-lg bg-muted" />
          ) : achievements ? (
            <AchievementsGallery achievements={achievements} />
          ) : null}
        </section>
      </div>
    </main>
  );
}
