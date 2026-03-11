import type { Metadata } from 'next';
import { ConsistencyPageClient } from './_components/consistency-page-client';

export const metadata: Metadata = {
  title: 'Consistency Hub',
};

export default function ConsistencyPage() {
  return (
    <main className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Consistency Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your publishing streak and consistency over time.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-6">
        <ConsistencyPageClient />
      </div>
    </main>
  );
}
