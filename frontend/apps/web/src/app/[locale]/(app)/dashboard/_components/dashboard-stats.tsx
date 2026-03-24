'use client';

import { Lightbulb, Kanban, FileText, Users } from 'lucide-react';
import { Skeleton } from '@ordo/ui';
import { useWorkspaceStore } from '@ordo/stores';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { StatsCard } from './stats-card';
import { ConsistencyMiniWidget } from './consistency-mini-widget';

export function DashboardStats() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const {
    isLoading,
    totalIdeas,
    inPipeline,
    publishedCount,
    memberCount,
    streak,
    consistencyLoading,
  } = useDashboardStats(activeWorkspaceId);

  return (
    <>
      {/* Stats grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[156px] w-full rounded-lg" />
            ))
          ) : (
            <>
              <StatsCard
                label="Total Ideas"
                value={totalIdeas}
                icon={<Lightbulb className="h-5 w-5" />}
              />
              <StatsCard
                label="In Pipeline"
                value={inPipeline}
                icon={<Kanban className="h-5 w-5" />}
              />
              <StatsCard
                label="Published"
                value={publishedCount}
                icon={<FileText className="h-5 w-5" />}
              />
              <StatsCard
                label="Team Members"
                value={memberCount}
                icon={<Users className="h-5 w-5" />}
              />
            </>
          )}
        </div>
      </section>

      {/* Consistency widget rendered here so it can share the same data */}
      {consistencyLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : (
        <ConsistencyMiniWidget streak={streak} />
      )}
    </>
  );
}
