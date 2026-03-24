'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useWorkspaceStore } from '@ordo/stores';
import { Skeleton } from '@ordo/ui';
import { usePlatformMetrics, usePipelineVelocity, useHeatmap, useBestPostingTimes } from '@/hooks/use-analytics';
import { BestTimesHeatmap } from '@/components/analytics/best-times-heatmap';
import { AnalyticsHeader, type AnalyticsPeriod } from './analytics-header';
import { PlatformMetricsGrid } from './platform-metrics-grid';
import { AnalyticsSkeleton } from './analytics-skeleton';

function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6 pb-2">
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="p-6 pt-0">
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}

const PipelineVelocityChart = dynamic(
  () => import('./pipeline-velocity-chart').then((mod) => mod.PipelineVelocityChart),
  { loading: () => <ChartSkeleton />, ssr: false },
);

const PublishingTrendChart = dynamic(
  () => import('./publishing-trend-chart').then((mod) => mod.PublishingTrendChart),
  { loading: () => <ChartSkeleton />, ssr: false },
);

export function AnalyticsPageClient() {
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const [bestTimesPlatform, setBestTimesPlatform] = React.useState('');
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const currentYear = new Date().getFullYear();

  const { data: platformData, isLoading: platformLoading } = usePlatformMetrics(
    activeWorkspaceId,
    period,
  );
  const { data: velocityData, isLoading: velocityLoading } = usePipelineVelocity(activeWorkspaceId);
  const { data: heatmapData, isLoading: heatmapLoading } = useHeatmap(activeWorkspaceId, currentYear);
  const { data: bestTimesData, isLoading: bestTimesLoading } = useBestPostingTimes(
    activeWorkspaceId,
    bestTimesPlatform || undefined,
  );

  const isLoading = platformLoading || velocityLoading || heatmapLoading;

  return (
    <>
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

            <BestTimesHeatmap
              data={bestTimesData}
              isLoading={bestTimesLoading}
              platform={bestTimesPlatform}
              onPlatformChange={setBestTimesPlatform}
            />
          </>
        )}
      </div>
    </>
  );
}
