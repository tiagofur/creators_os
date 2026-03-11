'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@ordo/core';
import { Button } from '@ordo/ui';
import { useWorkspaceStore } from '@ordo/stores';
import { useScheduledContent } from '@/hooks/use-publishing';
import { PublishingCalendar } from './_components/publishing-calendar';
import { PublishingList } from './_components/publishing-list';
import { ContentDetailSheet } from '@/components/pipeline/content-detail-sheet';
import type { ContentItem } from '@ordo/types';

type ViewMode = 'calendar' | 'list';

export default function PublishingPage() {
  const [viewMode, setViewMode] = React.useState<ViewMode>('calendar');
  const [selectedItem, setSelectedItem] = React.useState<ContentItem | null>(null);

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const now = new Date();
  const { data: scheduledItems, isLoading } = useScheduledContent(
    activeWorkspaceId,
    {
      from: format(startOfMonth(now), 'yyyy-MM-dd'),
      to: format(endOfMonth(now), 'yyyy-MM-dd'),
    },
  );

  const items = scheduledItems ?? [];

  return (
    <main className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Publishing</h1>
          <p className="mt-1 text-muted-foreground">
            Schedule and track your published content.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-md border">
          <button
            onClick={() => setViewMode('calendar')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-l-md transition-colors',
              viewMode === 'calendar'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent',
            )}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-r-md border-l transition-colors',
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent',
            )}
          >
            List
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <PublishingCalendar
          scheduledItems={items}
          onClickItem={setSelectedItem}
        />
      ) : (
        <PublishingList
          items={items}
          isLoading={isLoading}
          onClickItem={setSelectedItem}
        />
      )}

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
