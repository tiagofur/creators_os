'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@ordo/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@ordo/ui';
import { useNotifications, useMarkAllAsRead } from '@/hooks/use-notifications';
import { NotificationItem } from './notification-item';
import { NotificationsBell } from './notifications-bell';

export function NotificationsPopover() {
  const { data: notifications, isLoading } = useNotifications();
  const markAllRead = useMarkAllAsRead();
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  const recent = notifications?.slice(0, 20) ?? [];
  const hasUnread = recent.some((n) => !n.read);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <NotificationsBell />
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        aria-label="Notifications"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Notifications</h2>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => markAllRead.mutate()}
              loading={markAllRead.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto py-1" role="list" aria-live="polite">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              You&apos;re all caught up!
            </p>
          ) : (
            recent.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))
          )}
        </div>

        <div className="border-t px-4 py-2">
          <Link
            href={`/${locale}/inbox`}
            className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
