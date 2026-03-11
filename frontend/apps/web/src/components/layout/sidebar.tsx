'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Lightbulb,
  Kanban,
  BookOpen,
  Calendar,
  Send,
  Wand2,
  BarChart3,
  Target,
  Trophy,
  DollarSign,
  Inbox,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@ordo/core';
import { useUiStore } from '@ordo/stores';
import { Button } from '@ordo/ui';
import { WorkspaceSelector } from '@/components/workspace/workspace-selector';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: 'dashboard', icon: LayoutDashboard },
  { label: 'Ideas', href: 'ideas', icon: Lightbulb, section: 'Create' },
  { label: 'Pipeline', href: 'pipeline', icon: Kanban, section: 'Create' },
  { label: 'Series', href: 'series', icon: BookOpen, section: 'Create' },
  { label: 'Calendar', href: 'calendar', icon: Calendar, section: 'Create' },
  { label: 'Publishing', href: 'publishing', icon: Send, section: 'Create' },
  { label: 'AI Studio', href: 'studio', icon: Wand2, section: 'Grow' },
  { label: 'Analytics', href: 'analytics', icon: BarChart3, section: 'Grow' },
  { label: 'Goals', href: 'goals', icon: Target, section: 'Grow' },
  { label: 'Gamification', href: 'gamification', icon: Trophy, section: 'Grow' },
  { label: 'Sponsorships', href: 'sponsorships', icon: DollarSign, section: 'Grow' },
  { label: 'Inbox', href: 'inbox', icon: Inbox },
  { label: 'Search', href: 'search', icon: Search },
  { label: 'Settings', href: 'settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  // Extract locale prefix from pathname
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  const isActive = (href: string) => pathname.includes(`/${href}`);

  let lastSection: string | undefined;

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r bg-background transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo + workspace */}
      <div className="flex h-14 items-center border-b px-3">
        {!collapsed && (
          <WorkspaceSelector />
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            O
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const showSectionLabel =
            !collapsed && item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <div key={item.href}>
              {showSectionLabel && (
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.section}
                </p>
              )}
              <Link
                href={`/${locale}/${item.href}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive(item.href)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                  collapsed && 'justify-center px-2',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
