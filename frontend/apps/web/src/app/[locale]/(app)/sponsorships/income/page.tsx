'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useWorkspaceStore } from '@ordo/stores';
import { Skeleton } from '@ordo/ui';
import { useIncomeEntries, useSponsorshipDeals } from '@/hooks/use-sponsorships';
import { IncomeTracker } from '@/components/sponsorships/income-tracker';

function IncomeChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6 pb-2">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="p-6 pt-0">
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}

const IncomeChart = dynamic(
  () => import('@/components/sponsorships/income-chart').then((mod) => mod.IncomeChart),
  { loading: () => <IncomeChartSkeleton />, ssr: false },
);

export default function IncomePage() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { data: income, isLoading: incomeLoading } = useIncomeEntries(activeWorkspaceId);
  const { data: deals, isLoading: dealsLoading } = useSponsorshipDeals(activeWorkspaceId);

  const isLoading = incomeLoading || dealsLoading;

  return (
    <main className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Income</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track sponsorship income and payments.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
        {isLoading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-lg bg-muted" />
          </>
        ) : (
          <>
            <IncomeTracker income={income ?? []} deals={deals ?? []} />
            <IncomeChart income={income ?? []} />
          </>
        )}
      </div>
    </main>
  );
}
