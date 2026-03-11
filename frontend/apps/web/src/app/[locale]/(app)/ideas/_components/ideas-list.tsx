'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Skeleton } from '@ordo/ui';
import { EmptyState } from '@/components/empty-state';
import { IdeaCard } from './idea-card';
import type { Idea } from '@ordo/types';
import { Lightbulb } from 'lucide-react';

interface IdeasListProps {
  ideas: Idea[];
  isLoading?: boolean;
  viewMode?: 'grid' | 'list';
  selectedIds?: string[];
  onSelect?: (id: string, checked: boolean) => void;
  onEdit?: (idea: Idea) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMoveToPipeline?: (id: string) => void;
  onClickIdea?: (idea: Idea) => void;
  onCaptureIdea?: () => void;
}

export function IdeasList({
  ideas,
  isLoading,
  viewMode = 'grid',
  selectedIds = [],
  onSelect,
  onEdit,
  onArchive,
  onDelete,
  onMoveToPipeline,
  onClickIdea,
  onCaptureIdea,
}: IdeasListProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'gap-4',
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'flex flex-col',
        )}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <EmptyState
        icon={<Lightbulb className="h-10 w-10" />}
        title="No ideas yet"
        description="Capture your first idea using the button above or press Cmd+K."
        action={{ label: 'Capture idea', onClick: () => onCaptureIdea?.() }}
      />
    );
  }

  return (
    <div
      className={cn(
        'gap-4',
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'flex flex-col',
      )}
    >
      {ideas.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          selected={selectedIds.includes(idea.id)}
          onSelect={onSelect}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
          onMoveToPipeline={onMoveToPipeline}
          onClick={onClickIdea}
        />
      ))}
    </div>
  );
}
