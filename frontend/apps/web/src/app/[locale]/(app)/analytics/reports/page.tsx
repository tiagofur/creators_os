import type { Metadata } from 'next';
import { ReportsPageClient } from './_components/reports-page-client';

export const metadata: Metadata = {
  title: 'Reports',
};

export default function ReportsPage() {
  return (
    <main className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Summary reports of your creator activity.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
        <ReportsPageClient />
      </div>
    </main>
  );
}
