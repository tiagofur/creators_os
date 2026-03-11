'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Button } from '@ordo/ui';
import { useWorkspaceStore } from '@ordo/stores';
import { useIdeas } from '@/hooks/use-ideas';
import { GraveyardList } from '@/components/ideas/graveyard-list';
import type { IdeaStatus } from '@ordo/types';

type Tab = 'rejected' | 'archived';

export default function GraveyardPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('rejected');
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';

  // Map tab to status filter
  const statusMap: Record<Tab, IdeaStatus> = {
    rejected: 'archived', // rejected maps to archived status in our type system
    archived: 'archived',
  };

  const { data, isLoading } = useIdeas(activeWorkspaceId, {
    status: statusMap[activeTab],
  });

  const ideas = data?.data ?? [];

  return (
    <main className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Idea Graveyard</h1>
        <p className="mt-1 text-muted-foreground">
          Rejected and archived ideas. Resurrect them if your perspective changes.
        </p>
      </div>

      {/* Tab filter */}
      <div className="flex gap-1 rounded-md border p-1 w-fit">
        {(['rejected', 'archived'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded px-4 py-1.5 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <GraveyardList ideas={ideas} isLoading={isLoading} />
    </main>
  );
}
