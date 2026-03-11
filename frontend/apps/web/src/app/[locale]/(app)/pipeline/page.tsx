'use client';

import * as React from 'react';
import { useWorkspaceStore } from '@ordo/stores';
import { useContentItems } from '@/hooks/use-content';
import { KanbanBoard } from '@/components/pipeline/kanban-board';
import { PipelineToolbar, type PipelineViewMode } from '@/components/pipeline/pipeline-toolbar';
import { ContentDetailSheet } from '@/components/pipeline/content-detail-sheet';
import { KanbanBoardSkeleton } from '@/components/pipeline/kanban-board-skeleton';
import type { ContentItem } from '@ordo/types';

export default function PipelinePage() {
  const [search, setSearch] = React.useState('');
  const [platformFilter, setPlatformFilter] = React.useState('all');
  const [viewMode, setViewMode] = React.useState<PipelineViewMode>('board');
  const [selectedItem, setSelectedItem] = React.useState<ContentItem | null>(null);

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { data, isLoading } = useContentItems(activeWorkspaceId, {
    search: search || undefined,
    platform: platformFilter !== 'all' ? platformFilter : undefined,
  });

  const items = data?.data ?? [];

  return (
    <main className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="mt-1 text-muted-foreground">
            Track your content through every stage of production.
          </p>
        </div>
        <PipelineToolbar
          search={search}
          onSearchChange={setSearch}
          platformFilter={platformFilter}
          onPlatformChange={setPlatformFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <KanbanBoardSkeleton />
        ) : (
          <KanbanBoard
            items={items}
            onClickCard={setSelectedItem}
          />
        )}
      </div>

      {selectedItem && (
        <ContentDetailSheet
          item={selectedItem}
          open={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </main>
  );
}
