import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@ordo/ui';
import { QuickActions } from './_components/quick-actions';
import { RecentActivity } from './_components/recent-activity';
import { DashboardStats } from './_components/dashboard-stats';

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

      {/* Stats grid + Consistency widget (client component with real data) */}
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[156px] w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        }
      >
        <DashboardStats />
      </Suspense>

      {/* Bottom grid: recent activity */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
            <RecentActivity />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
