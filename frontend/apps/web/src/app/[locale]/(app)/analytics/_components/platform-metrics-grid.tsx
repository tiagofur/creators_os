import * as React from 'react';
import type { PlatformMetrics } from '@ordo/types';
import { PlatformMetricCard } from './platform-metric-card';

interface PlatformMetricsGridProps {
  metrics: PlatformMetrics[];
}

export function PlatformMetricsGrid({ metrics }: PlatformMetricsGridProps) {
  if (metrics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
        No platform data available. Connect a platform to see metrics.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {metrics.map((m) => (
        <PlatformMetricCard key={m.platform} metrics={m} />
      ))}
    </div>
  );
}
