'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { cn } from '@ordo/core';
import { Button } from '@ordo/ui';
import { KanbanCard } from './kanban-card';
import type { ContentItem, PipelineStage } from '@ordo/types';

const STAGE_LABELS: Record<PipelineStage, string> = {
  idea: 'Idea',
  scripting: 'Scripting',
  recording: 'Recording',
  editing: 'Editing',
  review: 'Review',
  publishing: 'Publishing',
};

interface KanbanColumnProps {
  stage: PipelineStage;
  items: ContentItem[];
  onAddContent?: (stage: PipelineStage) => void;
  onClickCard?: (item: ContentItem) => void;
}

export function KanbanColumn({
  stage,
  items,
  onAddContent,
  onClickCard,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex min-w-[280px] flex-col rounded-lg border bg-muted/30">
      {/* Column header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {items.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onAddContent?.(stage)}
          aria-label={`Add to ${STAGE_LABELS[stage]}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 p-2 min-h-[200px] transition-colors',
          isOver && 'bg-primary/5',
        )}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <KanbanCard key={item.id} item={item} onClick={onClickCard} />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Drop items here
          </p>
        )}
      </div>
    </div>
  );
}
