import type { Metadata } from 'next';
import { IdeasPageClient } from './_components/ideas-page-client';

export const metadata: Metadata = {
  title: 'Ideas',
};

export default function IdeasPage() {
  return (
    <main className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ideas</h1>
        <p className="mt-1 text-muted-foreground">
          Capture, validate, and manage your content ideas.
        </p>
      </div>

      <IdeasPageClient />
    </main>
  );
}
