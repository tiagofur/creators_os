'use client';

import * as React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { cn } from '@ordo/core';
import { Card, CardContent } from '@ordo/ui';
import { KanbanColumn } from './kanban-column';
import { useMoveStage } from '@/hooks/use-content';
import type { ContentItem, PipelineStage } from '@ordo/types';

const PIPELINE_STAGES: PipelineStage[] = [
  'idea',
  'scripting',
  'recording',
  'editing',
  'review',
  'publishing',
];

interface KanbanBoardProps {
  items: ContentItem[];
  onAddContent?: (stage: PipelineStage) => void;
  onClickCard?: (item: ContentItem) => void;
}

export function KanbanBoard({ items, onAddContent, onClickCard }: KanbanBoardProps) {
  const [activeItem, setActiveItem] = React.useState<ContentItem | null>(null);
  const { mutate: moveStage } = useMoveStage();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const itemsByStage = React.useMemo(() => {
    return PIPELINE_STAGES.reduce<Record<PipelineStage, ContentItem[]>>(
      (acc, stage) => {
        acc[stage] = items.filter((i) => i.pipeline_stage === stage);
        return acc;
      },
      {} as Record<PipelineStage, ContentItem[]>,
    );
  }, [items]);

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((i) => i.id === event.active.id);
    setActiveItem(item ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const draggedItem = items.find((i) => i.id === active.id);
    if (!draggedItem) return;

    // Determine target stage: either a column droppable (stage name) or another card
    const targetStage = PIPELINE_STAGES.includes(over.id as PipelineStage)
      ? (over.id as PipelineStage)
      : items.find((i) => i.id === over.id)?.pipeline_stage;

    if (targetStage && targetStage !== draggedItem.pipeline_stage) {
      moveStage({ id: draggedItem.id, stage: targetStage });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            items={itemsByStage[stage]}
            onAddContent={onAddContent}
            onClickCard={onClickCard}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem && (
          <Card className="w-[280px] shadow-lg opacity-90">
            <CardContent className="p-3">
              <p className="text-sm font-medium">{activeItem.title}</p>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
