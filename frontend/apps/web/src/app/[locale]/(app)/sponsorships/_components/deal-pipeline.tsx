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
  useDroppable,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@ordo/core';
import { Card, CardContent } from '@ordo/ui';
import { DealCard } from './deal-card';
import { useMoveDealStage } from '@/hooks/use-sponsorships';
import { useWorkspaceStore } from '@ordo/stores';
import type { SponsorshipDeal, DealStage } from '@ordo/types';

const DEAL_STAGES: DealStage[] = [
  'Prospect', 'Outreach', 'Negotiation', 'Contracted', 'Delivered', 'Paid', 'Rejected',
];

const STAGE_COLORS: Record<DealStage, string> = {
  Prospect: 'border-t-slate-400',
  Outreach: 'border-t-blue-400',
  Negotiation: 'border-t-yellow-400',
  Contracted: 'border-t-purple-500',
  Delivered: 'border-t-indigo-500',
  Paid: 'border-t-green-500',
  Rejected: 'border-t-red-400',
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface DraggableDealCardProps {
  deal: SponsorshipDeal;
  onClick?: () => void;
}

function DraggableDealCard({ deal, onClick }: DraggableDealCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn('touch-none', isDragging && 'opacity-40')}
    >
      <DealCard deal={deal} onClick={onClick} />
    </div>
  );
}

interface StageColumnProps {
  stage: DealStage;
  deals: SponsorshipDeal[];
  onClickDeal: (deal: SponsorshipDeal) => void;
  onAddDeal: () => void;
}

function StageColumn({ stage, deals, onClickDeal, onAddDeal }: StageColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const currency = deals[0]?.currency ?? 'USD';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[260px] shrink-0 flex-col rounded-lg border border-t-4 bg-muted/30',
        STAGE_COLORS[stage],
        isOver && 'bg-muted/60',
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <div>
          <p className="text-sm font-semibold">{stage}</p>
          <p className="text-xs text-muted-foreground">
            {deals.length} deal{deals.length !== 1 ? 's' : ''}
            {deals.length > 0 && ` · ${formatCurrency(totalValue, currency)}`}
          </p>
        </div>
        {stage === 'Prospect' && (
          <button
            onClick={onAddDeal}
            className="text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            + Add
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {deals.map((deal) => (
          <DraggableDealCard
            key={deal.id}
            deal={deal}
            onClick={() => onClickDeal(deal)}
          />
        ))}
      </div>
    </div>
  );
}

interface DealPipelineProps {
  deals: SponsorshipDeal[];
  onClickDeal: (deal: SponsorshipDeal) => void;
  onAddDeal: () => void;
}

export function DealPipeline({ deals, onClickDeal, onAddDeal }: DealPipelineProps) {
  const [activeDeal, setActiveDeal] = React.useState<SponsorshipDeal | null>(null);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { mutate: moveStage } = useMoveDealStage();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const dealsByStage = React.useMemo(() => {
    return DEAL_STAGES.reduce<Record<DealStage, SponsorshipDeal[]>>(
      (acc, stage) => {
        acc[stage] = deals.filter((d) => d.stage === stage);
        return acc;
      },
      {} as Record<DealStage, SponsorshipDeal[]>,
    );
  }, [deals]);

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over) return;

    const draggedDeal = deals.find((d) => d.id === active.id);
    if (!draggedDeal) return;

    const targetStage = DEAL_STAGES.includes(over.id as DealStage)
      ? (over.id as DealStage)
      : deals.find((d) => d.id === over.id)?.stage;

    if (targetStage && targetStage !== draggedDeal.stage) {
      moveStage({ workspaceId: activeWorkspaceId, dealId: draggedDeal.id, stage: targetStage });
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
        {DEAL_STAGES.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            deals={dealsByStage[stage]}
            onClickDeal={onClickDeal}
            onAddDeal={onAddDeal}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal && (
          <Card className="w-[252px] shadow-lg opacity-90">
            <CardContent className="p-3">
              <p className="text-sm font-medium">{activeDeal.title}</p>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
