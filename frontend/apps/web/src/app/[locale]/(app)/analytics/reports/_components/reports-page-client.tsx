'use client';

import * as React from 'react';
import { useWorkspaceStore } from '@ordo/stores';
import { useWeeklyReport, useMonthlyReport } from '@/hooks/use-analytics';
import { WeeklyReportCard, MonthlyReportCard } from '@/components/analytics/weekly-report-card';

function exportReportAsCsv(data: Record<string, unknown>, filename: string) {
  const rows = Object.entries(data).map(([key, value]) => `${key},${String(value)}`);
  const csv = ['key,value', ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPageClient() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';

  const { data: weeklyReport, isLoading: weeklyLoading } = useWeeklyReport(activeWorkspaceId);
  const { data: monthlyReport, isLoading: monthlyLoading } = useMonthlyReport(activeWorkspaceId);

  return (
    <>
      <section>
        <h2 className="mb-3 text-base font-semibold">Weekly Report</h2>
        {weeklyLoading ? (
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        ) : weeklyReport ? (
          <WeeklyReportCard
            report={weeklyReport}
            onExport={() => exportReportAsCsv(weeklyReport as unknown as Record<string, unknown>, 'weekly-report.csv')}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No weekly report available.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Monthly Report</h2>
        {monthlyLoading ? (
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        ) : monthlyReport ? (
          <MonthlyReportCard
            report={monthlyReport}
            onExport={() => exportReportAsCsv(monthlyReport as unknown as Record<string, unknown>, 'monthly-report.csv')}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No monthly report available.</p>
        )}
      </section>
    </>
  );
}
