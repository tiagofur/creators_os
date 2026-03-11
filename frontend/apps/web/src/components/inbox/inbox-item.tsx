'use client';

import { cn } from '@ordo/core';
import { Avatar, AvatarFallback } from '@ordo/ui';
import { useRouter } from 'next/navigation';
import type { AppNotification } from '@ordo/types';

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface InboxItemProps {
  item: AppNotification;
  onMarkRead: (id: string) => void;
}

export function InboxItem({ item, onMarkRead }: InboxItemProps) {
  const router = useRouter();

  function handleClick() {
    if (!item.read) onMarkRead(item.id);
    if (item.actionUrl) router.push(item.actionUrl);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => !item.read && onMarkRead(item.id)}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !item.read && 'bg-primary/5',
      )}
      aria-label={item.title}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback>{item.type[0]?.toUpperCase() ?? 'N'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-medium leading-snug">{item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{item.body}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
        {!item.read && (
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
        )}
      </div>
    </button>
  );
}
