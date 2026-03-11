'use client';

import * as React from 'react';
import { Copy, Check } from 'lucide-react';
import { Button, Badge, Skeleton, useToast } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { HashtagResponse, HashtagGroup } from '@ordo/types';

const TIER_LABELS: Record<HashtagGroup['tier'], string> = {
  top: 'Top-Level (High Reach)',
  mid: 'Mid-Tier (Medium Reach)',
  niche: 'Niche (Low Competition)',
};

const TIER_COLORS: Record<HashtagGroup['tier'], string> = {
  top: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  mid: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  niche: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

interface HashtagGroupCardProps {
  group: HashtagGroup;
}

function HashtagGroupCard({ group }: HashtagGroupCardProps) {
  const { toast } = useToast();
  const [copiedTag, setCopiedTag] = React.useState<string | null>(null);

  const copyTag = async (tag: string) => {
    await navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast({ title: `${tag} copied!` });
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const copyAll = async () => {
    const text = group.hashtags.join(' ');
    await navigator.clipboard.writeText(text);
    toast({ title: `${group.hashtags.length} hashtags copied!` });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TIER_COLORS[group.tier])}>
          {TIER_LABELS[group.tier]}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={copyAll}
          leftIcon={<Copy className="h-3 w-3" />}
        >
          Copy all
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {group.hashtags.map((tag) => (
          <button
            key={tag}
            onClick={() => copyTag(tag)}
            className="flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-xs font-medium hover:bg-accent transition-colors"
          >
            {copiedTag === tag ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : null}
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

interface HashtagResultsProps {
  result: HashtagResponse | null;
  isLoading: boolean;
}

export function HashtagResults({ result, isLoading }: HashtagResultsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<'hashtags' | 'caption'>('hashtags');

  const copyAllHashtags = async () => {
    if (!result) return;
    const allTags = result.groups.flatMap((g) => g.hashtags).join(' ');
    await navigator.clipboard.writeText(allTags);
    toast({ title: 'All hashtags copied!' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, j) => (
                <Skeleton key={j} className="h-6 w-20 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['hashtags', 'caption'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={
              activeTab === tab
                ? 'border-b-2 border-primary px-4 py-2 text-sm font-medium text-foreground'
                : 'px-4 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {tab === 'hashtags' ? 'Hashtags' : 'Caption Generator'}
          </button>
        ))}
      </div>

      {activeTab === 'hashtags' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={copyAllHashtags}
              leftIcon={<Copy className="h-3.5 w-3.5" />}
            >
              Copy all hashtags
            </Button>
          </div>
          {result.groups.map((group) => (
            <HashtagGroupCard key={group.tier} group={group} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border p-4 space-y-3">
          {result.caption ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Generated Caption</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(result.caption ?? '');
                    toast({ title: 'Caption copied!' });
                  }}
                  leftIcon={<Copy className="h-3 w-3" />}
                >
                  Copy
                </Button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.caption}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Caption will appear here when generated alongside hashtags.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
