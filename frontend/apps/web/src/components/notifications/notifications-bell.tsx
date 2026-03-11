'use client';

import * as React from 'react';
import { Button } from '@ordo/ui';
import { Bell } from 'lucide-react';
import { cn } from '@ordo/core';
import { useUnreadCount } from '@/hooks/use-notifications';

export const NotificationsBell = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>((props, ref) => {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
      {...props}
    >
      <span className="relative">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span
            className={cn(
              'absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none',
            )}
            aria-hidden="true"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </span>
    </Button>
  );
});
NotificationsBell.displayName = 'NotificationsBell';
