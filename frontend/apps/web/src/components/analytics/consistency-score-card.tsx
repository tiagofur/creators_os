'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Card, CardContent } from '@ordo/ui';
import { Badge } from '@ordo/ui';
import type { ConsistencyScore } from '@ordo/types';

const LEVEL_STYLES: Record<ConsistencyScore['level'], string> = {
  Beginner: 'bg-secondary text-secondary-foreground',
  Consistent: 'bg-info text-info-foreground',
  Pro: 'bg-primary text-primary-foreground',
  Elite: 'bg-yellow-500 text-yellow-950',
};

const RING_COLOR: Record<ConsistencyScore['level'], string> = {
  Beginner: '#94a3b8',
  Consistent: '#3b82f6',
  Pro: '#8b5cf6',
  Elite: '#eab308',
};

interface ConsistencyScoreCardProps {
  data: ConsistencyScore;
}

export function ConsistencyScoreCard({ data }: ConsistencyScoreCardProps) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(data.score, 100) / 100;
  const dashOffset = circumference * (1 - progress);
  const ringColor = RING_COLOR[data.level];

  return (
    <Card>
      <CardContent className="flex flex-col items-center py-8">
        {/* Circular progress ring */}
        <div className="relative mb-4 flex h-36 w-36 items-center justify-center">
          <svg className="absolute inset-0" width="144" height="144" viewBox="0 0 144 144">
            <circle
              cx="72"
              cy="72"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-muted"
            />
            <circle
              cx="72"
              cy="72"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 72 72)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="text-center">
            <p className="text-4xl font-bold leading-none">{data.score}</p>
            <p className="text-xs text-muted-foreground">/ 100</p>
          </div>
        </div>

        {/* Level badge */}
        <span
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
            LEVEL_STYLES[data.level],
          )}
        >
          {data.level}
        </span>

        {/* Published this month */}
        <p className="mt-4 text-sm text-muted-foreground">
          Published{' '}
          <span className="font-semibold text-foreground">{data.publishedThisMonth}</span>
          {' / '}
          <span className="font-semibold text-foreground">{data.targetPerMonth}</span>
          {' '}this month
        </p>
      </CardContent>
    </Card>
  );
}
