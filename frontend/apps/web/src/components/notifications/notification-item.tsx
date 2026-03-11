'use client';

import { cn } from '@ordo/core';
import { useRouter } from 'next/navigation';
import { useMarkAsRead } from '@/hooks/use-notifications';
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

interface NotificationItemProps {
  notification: AppNotification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();
  const markAsRead = useMarkAsRead();

  function handleClick() {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !notification.read && 'bg-primary/5',
      )}
      aria-label={notification.title}
    >
      {/* Unread dot */}
      <span
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          notification.read ? 'bg-transparent' : 'bg-primary',
        )}
        aria-hidden="true"
      />
      <div className="flex-1 overflow-hidden">
        <p className="font-medium leading-snug">{notification.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</span>
    </button>
  );
}
