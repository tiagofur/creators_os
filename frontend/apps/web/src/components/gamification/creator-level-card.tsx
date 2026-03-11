import * as React from 'react';
import { Card, CardContent } from '@ordo/ui';
import { XpProgressBar } from './xp-progress-bar';
import type { GamificationProfile } from '@ordo/types';

interface CreatorLevelCardProps {
  profile: GamificationProfile;
}

export function CreatorLevelCard({ profile }: CreatorLevelCardProps) {
  const { level } = profile;

  return (
    <Card>
      <CardContent className="flex flex-col items-center py-8 text-center">
        {/* Avatar placeholder */}
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
          {level.level}
        </div>

        <p className="text-xl font-bold">{level.title}</p>
        <p className="text-sm text-muted-foreground">Level {level.level}</p>

        <div className="mt-4 w-full max-w-xs">
          <XpProgressBar level={level} />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Total XP: <span className="font-semibold text-foreground">{profile.totalXp.toLocaleString()}</span>
        </p>
      </CardContent>
    </Card>
  );
}
