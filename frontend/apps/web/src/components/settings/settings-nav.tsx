'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@ordo/core';

const NAV_ITEMS = [
  { label: 'Profile', href: 'profile' },
  { label: 'Workspace', href: 'workspace' },
  { label: 'Team', href: 'team' },
  { label: 'Integrations', href: 'integrations' },
  { label: 'Notifications', href: 'notifications' },
  { label: 'Billing', href: 'billing' },
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  const isActive = (href: string) => pathname.includes(`/settings/${href}`);

  return (
    <nav aria-label="Settings navigation">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={`/${locale}/settings/${item.href}`}
              className={cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground',
              )}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
