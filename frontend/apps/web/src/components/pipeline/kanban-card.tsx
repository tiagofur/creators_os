'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, isPast } from 'date-fns';
import { GripVertical } from 'lucide-react';
import { cn } from '@ordo/core';
import { Badge, Card, CardContent } from '@ordo/ui';
import type { ContentItem } from '@ordo/types';

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-100 text-red-700',
  instagram: 'bg-purple-100 text-purple-700',
  tiktok: 'bg-sky-100 text-sky-700',
  twitter: 'bg-blue-100 text-blue-700',
  linkedin: 'bg-indigo-100 text-indigo-700',
  podcast: 'bg-amber-100 text-amber-700',
  blog: 'bg-green-100 text-green-700',
};

interface KanbanCardProps {
  item: ContentItem;
  onClick?: (item: ContentItem) => void;
}

export function KanbanCard({ item, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    item.scheduled_at != null && isPast(new Date(item.scheduled_at));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-50')}
    >
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md"
        onClick={() => onClick?.(item)}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
              aria-label="Drag to reorder"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium leading-snug line-clamp-2">
                {item.title}
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                {item.platform && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      PLATFORM_COLORS[item.platform] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {item.platform}
                  </span>
                )}

                {item.scheduled_at && (
                  <span
                    className={cn(
                      'text-xs',
                      isOverdue
                        ? 'text-destructive font-medium'
                        : 'text-muted-foreground',
                    )}
                  >
                    {format(new Date(item.scheduled_at), 'MMM d')}
                    {isOverdue && ' (overdue)'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
