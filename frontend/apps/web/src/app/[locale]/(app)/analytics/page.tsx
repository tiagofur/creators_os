import type { Metadata } from 'next';
import { AnalyticsPageClient } from './_components/analytics-page-client';

export const metadata: Metadata = {
  title: 'Analytics',
};

export default function AnalyticsPage() {
  return (
    <main className="flex h-full flex-col">
      <AnalyticsPageClient />
    </main>
  );
}
