'use client';

import { format } from 'date-fns';
import { Calendar, MoreHorizontal } from 'lucide-react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  useToast,
} from '@ordo/ui';
import { useUnscheduleContent } from '@/hooks/use-publishing';
import { EmptyState } from '@/components/empty-state';
import type { ContentItem } from '@ordo/types';

const STATUS_VARIANT: Record<string, string> = {
  scheduled: 'default',
  published: 'success',
  archived: 'secondary',
};

interface PublishingListProps {
  items: ContentItem[];
  isLoading?: boolean;
  onClickItem?: (item: ContentItem) => void;
}

export function PublishingList({
  items,
  isLoading,
  onClickItem,
}: PublishingListProps) {
  const { mutate: unschedule } = useUnscheduleContent();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-10 w-10" />}
        title="No scheduled content"
        description="Schedule content from the pipeline to see it here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 rounded-lg border bg-background px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onClickItem?.(item)}
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{item.title}</p>
            {item.scheduled_at && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.scheduled_at), 'PPP p')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {item.platform && (
              <Badge variant="secondary" className="capitalize">
                {item.platform}
              </Badge>
            )}
            <Badge
              variant={STATUS_VARIANT[item.status] as 'default' | 'secondary'}
              className="capitalize"
            >
              {item.status}
            </Badge>

            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      unschedule(item.id);
                      toast({ title: 'Unscheduled' });
                    }}
                  >
                    Unschedule
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
