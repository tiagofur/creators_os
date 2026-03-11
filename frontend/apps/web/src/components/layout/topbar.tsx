'use client';

import { Menu } from 'lucide-react';
import { Button, Avatar, AvatarImage, AvatarFallback } from '@ordo/ui';
import { useAuth } from '@ordo/hooks';
import { getInitials } from '@ordo/core';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Breadcrumb } from './breadcrumb';
import { QuickCaptureTrigger } from '@/components/ideas/quick-capture-trigger';
import { CommandPaletteTrigger } from '@/components/command-palette/command-palette-trigger';
import { NotificationsPopover } from '@/components/notifications/notifications-popover';
import { MobileSidebar } from './mobile-sidebar';

export function Topbar() {
  const { user } = useAuth();

  return (
    <header className="flex h-14 items-center border-b bg-background px-4 gap-4">
      {/* Hamburger — mobile only */}
      <MobileSidebar />

      {/* Dynamic breadcrumb from pathname */}
      <div className="flex-1 min-w-0">
        <Breadcrumb />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Command palette trigger (search) */}
        <CommandPaletteTrigger />

        {/* Quick capture — visible button + Cmd+K listener */}
        <QuickCaptureTrigger />

        {/* Notifications bell + popover */}
        <NotificationsPopover />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User avatar */}
        {user && (
          <Avatar className="h-8 w-8">
            {user.avatar_url && (
              <AvatarImage src={user.avatar_url} alt={user.name} />
            )}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  );
}
