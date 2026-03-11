import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Lightbulb, Kanban, FileText, Users } from 'lucide-react';
import { Skeleton } from '@ordo/ui';
import { StatsCard } from './_components/stats-card';
import { QuickActions } from './_components/quick-actions';
import { RecentActivity } from './_components/recent-activity';
import { ConsistencyMiniWidget } from './_components/consistency-mini-widget';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <main className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back. Here's your creator overview.
        </p>
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <QuickActions />
      </section>

      {/* Stats grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Suspense fallback={<Skeleton className="h-[156px] w-full rounded-lg" />}>
            <StatsCard
              label="Total Ideas"
              value="—"
              icon={<Lightbulb className="h-5 w-5" />}
            />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-[156px] w-full rounded-lg" />}>
            <StatsCard
              label="In Pipeline"
              value="—"
              icon={<Kanban className="h-5 w-5" />}
            />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-[156px] w-full rounded-lg" />}>
            <StatsCard
              label="Published"
              value="—"
              icon={<FileText className="h-5 w-5" />}
            />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-[156px] w-full rounded-lg" />}>
            <StatsCard
              label="Team Members"
              value="—"
              icon={<Users className="h-5 w-5" />}
            />
          </Suspense>
        </div>
      </section>

      {/* Bottom grid: recent activity + consistency */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
            <RecentActivity />
          </Suspense>
        </div>
        <div>
          <ConsistencyMiniWidget streak={0} />
        </div>
      </section>
    </main>
  );
}
