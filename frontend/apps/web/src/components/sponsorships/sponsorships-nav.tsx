'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Kanban, Users, TrendingUp } from 'lucide-react';
import { cn } from '@ordo/core';

interface NavLink {
  label: string;
  segment: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SPONSORSHIPS_NAV_LINKS: NavLink[] = [
  { label: 'Pipeline', segment: '', icon: Kanban },
  { label: 'Brands', segment: 'brands', icon: Users },
  { label: 'Income', segment: 'income', icon: TrendingUp },
];

export function SponsorshipsNav() {
  const pathname = usePathname();

  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  const isActive = (segment: string) => {
    if (segment === '') {
      // Pipeline is the index — active only if NOT on brands or income sub-pages
      return pathname.endsWith('/sponsorships') || pathname.endsWith('/sponsorships/');
    }
    return pathname.includes(`/sponsorships/${segment}`);
  };

  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-b px-4 bg-background">
      {SPONSORSHIPS_NAV_LINKS.map((link) => {
        const href =
          link.segment === ''
            ? `/${locale}/sponsorships`
            : `/${locale}/sponsorships/${link.segment}`;

        return (
          <Link
            key={link.segment}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive(link.segment)
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground',
            )}
          >
            <link.icon className="h-4 w-4 shrink-0" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
