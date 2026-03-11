'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useRouter, usePathname } from 'next/navigation';
import { Dialog, DialogContent } from '@ordo/ui';
import { Lightbulb, FileText, Wand2, Search } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/use-global-search';
import { useWorkspaceStore } from '@ordo/stores';
import { CommandResultItem } from './command-result-item';
import { trackEvent } from '@/lib/analytics';
import type { SearchResult } from '@ordo/types';

const RECENT_KEY = 'ordo:recent-commands';
const RECENT_MAX = 5;

interface RecentItem {
  title: string;
  url: string;
}

function getRecent(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentItem[];
  } catch {
    return [];
  }
}

function addRecent(item: RecentItem) {
  if (typeof window === 'undefined') return;
  const existing = getRecent().filter((r) => r.url !== item.url);
  const updated = [item, ...existing].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const router = useRouter();
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch?.[1] ?? 'en';

  const workspace = useWorkspaceStore((s) => s.activeWorkspace);
  const { data: results, isLoading } = useGlobalSearch(query, workspace?.id ?? '');
  const [recent, setRecent] = React.useState<RecentItem[]>([]);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setRecent(getRecent());
    }
  }, [open]);

  function navigate(url: string, title: string) {
    addRecent({ url, title });
    onOpenChange(false);
    router.push(url);
  }

  function handleResultSelect(result: SearchResult) {
    navigate(result.url, result.title);
  }

  const groupedResults = React.useMemo(() => {
    if (!results?.length) return {};
    return results.reduce<Record<string, SearchResult[]>>((acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type]!.push(r);
      return acc;
    }, {});
  }, [results]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-xl">
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          shouldFilter={false}
        >
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search or type a command…"
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Command palette search"
            />
            <kbd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty>
              {isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Searching…</p>
              ) : query.length >= 2 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;. Try different keywords.
                </p>
              ) : null}
            </Command.Empty>

            {/* Quick actions */}
            {!query && (
              <Command.Group heading="Quick actions">
                <Command.Item
                  onSelect={() => {
                    trackEvent('idea_captured', { source: 'cmd_k' });
                    navigate(`/${locale}/ideas?capture=true`, 'Capture idea');
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  Capture idea
                </Command.Item>
                <Command.Item
                  onSelect={() => navigate(`/${locale}/pipeline?new=true`, 'Create content')}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Create content
                </Command.Item>
                <Command.Item
                  onSelect={() => navigate(`/${locale}/studio`, 'Go to AI Studio')}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <Wand2 className="h-4 w-4 text-muted-foreground" />
                  Go to AI Studio
                </Command.Item>
              </Command.Group>
            )}

            {/* Recent items */}
            {!query && recent.length > 0 && (
              <Command.Group heading="Recent">
                {recent.map((item) => (
                  <Command.Item
                    key={item.url}
                    value={item.url}
                    onSelect={() => navigate(item.url, item.title)}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <span className="truncate">{item.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Search results */}
            {query.length >= 2 && Object.entries(groupedResults).map(([type, items]) => (
              <Command.Group key={type} heading={type.charAt(0).toUpperCase() + type.slice(1) + 's'}>
                {items.map((result) => (
                  <Command.Item
                    key={result.id}
                    value={result.id}
                    onSelect={() => handleResultSelect(result)}
                    className="cursor-pointer rounded-md px-2 py-2 aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <CommandResultItem result={result} />
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
