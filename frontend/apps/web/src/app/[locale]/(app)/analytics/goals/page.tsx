import type { Metadata } from 'next';
import { GoalsPageClient } from './_components/goals-page-client';

export const metadata: Metadata = {
  title: 'Goals',
};

export default function GoalsPage() {
  return (
    <main className="flex h-full flex-col">
      <GoalsPageClient />
    </main>
  );
}
