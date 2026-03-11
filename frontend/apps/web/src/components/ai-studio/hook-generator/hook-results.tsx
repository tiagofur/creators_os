'use client';

import * as React from 'react';
import { Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button, Badge, Skeleton, useToast } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { GeneratedHook } from '@ordo/types';

const HOOK_STYLE_LABELS: Record<string, string> = {
  question: 'Question',
  'shocking-stat': 'Shocking Stat',
  story: 'Story',
  contrarian: 'Contrarian',
};

const RATINGS_KEY = 'ordo-hook-ratings';

function loadRatings(): Record<string, 'up' | 'down'> {
  try {
    return JSON.parse(localStorage.getItem(RATINGS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveRating(hookText: string, rating: 'up' | 'down') {
  const ratings = loadRatings();
  ratings[hookText] = rating;
  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
}

interface HookCardProps {
  hook: GeneratedHook;
}

function HookCard({ hook }: HookCardProps) {
  const { toast } = useToast();
  const [rating, setRating] = React.useState<'up' | 'down' | null>(
    () => loadRatings()[hook.hook_text] ?? null,
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hook.hook_text);
    toast({ title: 'Hook copied!' });
  };

  const handleRating = (r: 'up' | 'down') => {
    setRating(r);
    saveRating(hook.hook_text, r);
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-base font-semibold leading-snug flex-1">{hook.hook_text}</p>
        <Badge
          variant="outline"
          className="shrink-0 text-xs capitalize"
        >
          {HOOK_STYLE_LABELS[hook.style] ?? hook.style}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          leftIcon={<Copy className="h-3 w-3" />}
        >
          Copy
        </Button>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => handleRating('up')}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded transition-colors',
              rating === 'up'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="Thumbs up"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleRating('down')}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded transition-colors',
              rating === 'down'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="Thumbs down"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface HookResultsProps {
  hooks: GeneratedHook[];
  isLoading: boolean;
}

export function HookResults({ hooks, isLoading }: HookResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (hooks.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{hooks.length} hooks generated</p>
      {hooks.map((hook) => (
        <HookCard key={hook.id} hook={hook} />
      ))}
    </div>
  );
}
