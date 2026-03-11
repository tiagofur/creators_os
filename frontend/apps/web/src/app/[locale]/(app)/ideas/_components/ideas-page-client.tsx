'use client';

import * as React from 'react';
import { useWorkspaceStore } from '@ordo/stores';
import { useIdeas, useDeleteIdea, useChangeIdeaStatus } from '@/hooks/use-ideas';
import { IdeasList } from './ideas-list';
import { IdeasFilters } from './ideas-filters';
import { IdeasToolbar, type SortOption } from './ideas-toolbar';
import { QuickCaptureModal } from '@/components/ideas/quick-capture-modal';
import { IdeaDetailSheet } from '@/components/ideas/idea-detail-sheet';
import type { IdeaFilters } from '@/hooks/use-ideas';
import type { Idea } from '@ordo/types';

export function IdeasPageClient() {
  const [filters, setFilters] = React.useState<IdeaFilters>({});
  const [sort, setSort] = React.useState<SortOption>('newest');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [captureOpen, setCaptureOpen] = React.useState(false);
  const [selectedIdea, setSelectedIdea] = React.useState<Idea | null>(null);

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { data, isLoading } = useIdeas(activeWorkspaceId, filters);
  const { mutate: deleteIdea } = useDeleteIdea();
  const { mutate: changeStatus } = useChangeIdeaStatus();

  const ideas = React.useMemo(() => {
    const list = data?.data ?? [];
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [data, sort]);

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((i) => i !== id),
    );
  };

  const handleBulkArchive = () => {
    selectedIds.forEach((id) => changeStatus({ id, status: 'archived' }));
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => deleteIdea(id));
    setSelectedIds([]);
  };

  return (
    <>
      <IdeasFilters filters={filters} onChange={setFilters} />

      <IdeasToolbar
        sort={sort}
        onSortChange={setSort}
        selectedCount={selectedIds.length}
        onBulkArchive={handleBulkArchive}
        onBulkDelete={handleBulkDelete}
        onCreateIdea={() => setCaptureOpen(true)}
      />

      <IdeasList
        ideas={ideas}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onArchive={(id) => changeStatus({ id, status: 'archived' })}
        onDelete={(id) => deleteIdea(id)}
        onClickIdea={setSelectedIdea}
        onCaptureIdea={() => setCaptureOpen(true)}
      />

      <QuickCaptureModal
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
      />

      {selectedIdea && (
        <IdeaDetailSheet
          idea={selectedIdea}
          open={Boolean(selectedIdea)}
          onClose={() => setSelectedIdea(null)}
        />
      )}
    </>
  );
}
