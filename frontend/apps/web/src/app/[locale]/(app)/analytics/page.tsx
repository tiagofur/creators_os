'use client';

import * as React from 'react';
import { useWorkspaceStore } from '@ordo/stores';
import { usePlatformMetrics, usePipelineVelocity, useHeatmap } from '@/hooks/use-analytics';
import { AnalyticsHeader, type AnalyticsPeriod } from './_components/analytics-header';
import { PlatformMetricsGrid } from './_components/platform-metrics-grid';
import { PipelineVelocityChart } from './_components/pipeline-velocity-chart';
import { PublishingTrendChart } from './_components/publishing-trend-chart';
import { AnalyticsSkeleton } from './_components/analytics-skeleton';

export default function AnalyticsPage() {
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const currentYear = new Date().getFullYear();

  const { data: platformData, isLoading: platformLoading } = usePlatformMetrics(
    activeWorkspaceId,
    period,
  );
  const { data: velocityData, isLoading: velocityLoading } = usePipelineVelocity(activeWorkspaceId);
  const { data: heatmapData, isLoading: heatmapLoading } = useHeatmap(activeWorkspaceId, currentYear);

  const isLoading = platformLoading || velocityLoading || heatmapLoading;

  return (
    <main className="flex h-full flex-col">
      <AnalyticsHeader period={period} onPeriodChange={setPeriod} />

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
        {isLoading ? (
          <AnalyticsSkeleton />
        ) : (
          <>
            <PlatformMetricsGrid metrics={platformData ?? []} />

            <div className="grid gap-4 lg:grid-cols-2">
              <PipelineVelocityChart data={velocityData ?? []} />
              <PublishingTrendChart data={heatmapData ?? []} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
