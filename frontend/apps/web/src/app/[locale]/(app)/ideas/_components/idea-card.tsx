'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, Archive, ArrowRight } from 'lucide-react';
import { cn } from '@ordo/core';
import {
  Card,
  CardContent,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Checkbox,
} from '@ordo/ui';
import type { Idea, IdeaStatus } from '@ordo/types';

const STATUS_VARIANT: Record<IdeaStatus, string> = {
  inbox: 'secondary',
  validated: 'success',
  in_progress: 'default',
  done: 'success',
  archived: 'secondary',
};

interface IdeaCardProps {
  idea: Idea;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onEdit?: (idea: Idea) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMoveToPipeline?: (id: string) => void;
  onClick?: (idea: Idea) => void;
}

export function IdeaCard({
  idea,
  selected,
  onSelect,
  onEdit,
  onArchive,
  onDelete,
  onMoveToPipeline,
  onClick,
}: IdeaCardProps) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-shadow hover:shadow-md',
        selected && 'ring-2 ring-primary',
      )}
      onClick={() => onClick?.(idea)}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div
          className="absolute left-3 top-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(idea.id, Boolean(checked))}
            aria-label={`Select ${idea.title}`}
          />
        </div>
      )}

      <CardContent className={cn('p-4', onSelect && 'pl-10')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug line-clamp-2">{idea.title}</p>
            {idea.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {idea.description}
              </p>
            )}
          </div>

          {/* Action menu */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label="Actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(idea)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMoveToPipeline?.(idea.id)}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Move to pipeline
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onArchive?.(idea.id)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(idea.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Footer: platform tags + status + date */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {idea.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs capitalize">
              {tag}
            </Badge>
          ))}
          <Badge
            variant={STATUS_VARIANT[idea.status] as 'default' | 'secondary' | 'success'}
            className="text-xs capitalize"
          >
            {idea.status}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
