'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { useNotifications, useMarkAsRead } from '@/hooks/use-notifications';
import { InboxItem } from './inbox-item';
import { EmptyState } from '@/components/empty-state';
import { Inbox } from 'lucide-react';

type FilterTab = 'all' | 'unread' | 'comments' | 'mentions' | 'approvals';

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'comments', label: 'Comments' },
  { value: 'mentions', label: 'Mentions' },
  { value: 'approvals', label: 'Approvals' },
];

export function InboxList() {
  const [tab, setTab] = React.useState<FilterTab>('all');
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  const filtered = React.useMemo(() => {
    if (!notifications) return [];
    if (tab === 'all') return notifications;
    if (tab === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === tab);
  }, [notifications, tab]);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 border-b px-1 pb-px" role="tablist" aria-label="Inbox filters">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === t.value
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-live="polite" className="mt-2">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-10 w-10" />}
            title="You're all caught up!"
            description="No items in this view."
            className="mx-4 mt-4"
          />
        ) : (
          <div className="divide-y">
            {filtered.map((item) => (
              <InboxItem
                key={item.id}
                item={item}
                onMarkRead={(id) => markAsRead.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
