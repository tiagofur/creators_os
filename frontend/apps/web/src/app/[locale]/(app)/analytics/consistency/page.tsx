'use client';

import * as React from 'react';
import { useWorkspaceStore } from '@ordo/stores';
import { useConsistencyScore, useHeatmap } from '@/hooks/use-analytics';
import { ConsistencyHeatmap } from '@/components/analytics/consistency-heatmap';
import { ConsistencyScoreCard } from '@/components/analytics/consistency-score-card';
import { StreakDisplay } from '@/components/analytics/streak-display';

export default function ConsistencyPage() {
  const [year, setYear] = React.useState(new Date().getFullYear());
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';

  const { data: consistency, isLoading: scoreLoading } = useConsistencyScore(activeWorkspaceId);
  const { data: heatmap, isLoading: heatmapLoading } = useHeatmap(activeWorkspaceId, year);

  return (
    <main className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Consistency Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your publishing streak and consistency over time.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
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
      </div>
    </main>
  );
}
