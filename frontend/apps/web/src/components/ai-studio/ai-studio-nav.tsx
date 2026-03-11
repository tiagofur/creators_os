'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Lightbulb,
  Type,
  FileText,
  Repeat2,
  Hash,
} from 'lucide-react';
import { cn } from '@ordo/core';
import { CreditBalanceWidget } from './credit-balance-widget';

interface NavLink {
  label: string;
  segment: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AI_NAV_LINKS: NavLink[] = [
  { label: 'Chat', segment: 'chat', icon: MessageSquare },
  { label: 'Brainstormer', segment: 'brainstormer', icon: Lightbulb },
  { label: 'Title Lab', segment: 'title-lab', icon: Type },
  { label: 'Script Doctor', segment: 'script-doctor', icon: FileText },
  { label: 'Remix Engine', segment: 'remix', icon: Repeat2 },
  { label: 'Hashtag Generator', segment: 'hashtags', icon: Hash },
];

export function AiStudioNav() {
  const pathname = usePathname();

  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  const isActive = (segment: string) =>
    pathname.includes(`/ai-studio/${segment}`);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-background">
      <div className="flex h-12 items-center border-b px-4">
        <h2 className="text-sm font-semibold text-foreground">AI Studio</h2>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {AI_NAV_LINKS.map((link) => (
          <Link
            key={link.segment}
            href={`/${locale}/ai-studio/${link.segment}`}
            className={cn(
              'flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors',
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
        ))}
      </nav>

      <div className="border-t pb-2">
        <CreditBalanceWidget />
      </div>
    </aside>
  );
}
