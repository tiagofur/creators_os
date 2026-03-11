'use client';

import * as React from 'react';
import { useWorkspaceStore } from '@ordo/stores';
import { useConsistencyScore, useHeatmap } from '@/hooks/use-analytics';
import { ConsistencyHeatmap } from '@/components/analytics/consistency-heatmap';
import { ConsistencyScoreCard } from '@/components/analytics/consistency-score-card';
import { StreakDisplay } from '@/components/analytics/streak-display';

export function ConsistencyPageClient() {
  const [year, setYear] = React.useState(new Date().getFullYear());
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';

  const { data: consistency, isLoading: scoreLoading } = useConsistencyScore(activeWorkspaceId);
  const { data: heatmap, isLoading: heatmapLoading } = useHeatmap(activeWorkspaceId, year);

  return (
    <>
      {/* Score + streak row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {scoreLoading ? (
          <>
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          </>
        ) : consistency ? (
          <>
            <ConsistencyScoreCard data={consistency} />
            <StreakDisplay data={consistency} />
          </>
        ) : null}
      </div>

      {/* Heatmap */}
      <div className="rounded-lg border bg-background p-6">
        <h2 className="mb-4 text-base font-semibold">Publishing Heatmap</h2>
        {heatmapLoading ? (
          <div className="h-40 animate-pulse rounded bg-muted" />
        ) : (
          <ConsistencyHeatmap
            data={heatmap ?? []}
            year={year}
            onYearChange={setYear}
          />
        )}
      </div>
    </>
  );
}
