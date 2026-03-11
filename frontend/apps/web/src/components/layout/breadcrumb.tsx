'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '@ordo/core';

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  ideas: 'Ideas',
  validate: 'Validate',
  graveyard: 'Graveyard',
  pipeline: 'Pipeline',
  series: 'Series',
  publishing: 'Publishing',
  settings: 'Settings',
  integrations: 'Integrations',
  studio: 'AI Studio',
  analytics: 'Analytics',
  goals: 'Goals',
  gamification: 'Gamification',
  sponsorships: 'Sponsorships',
  inbox: 'Inbox',
  search: 'Search',
};

function toLabel(segment: string): string {
  // UUID-like segments get replaced with ellipsis (title loaded dynamically)
  if (/^[0-9a-f-]{36}$/.test(segment)) return '…';
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumb() {
  const pathname = usePathname();
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';

  // Strip locale and route group prefixes
  const segments = pathname
    .replace(/^\/[a-z]{2}\//, '')
    .split('/')
    .filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs: BreadcrumbSegment[] = segments.map((segment, index) => {
    const href = `/${locale}/${segments.slice(0, index + 1).join('/')}`;
    return { label: toLabel(segment), href };
  });

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {i === crumbs.length - 1 || !crumb.href ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
