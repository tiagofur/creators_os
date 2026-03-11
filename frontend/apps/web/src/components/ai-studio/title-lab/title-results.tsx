'use client';

import * as React from 'react';
import { Copy, Check } from 'lucide-react';
import { Button, Badge, Skeleton, useToast } from '@ordo/ui';
import { cn } from '@ordo/core';
import type { GeneratedTitle, CTRPrediction } from '@ordo/types';

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  youtube: 100,
  tiktok: 150,
  instagram: 125,
  twitter: 280,
  linkedin: 200,
  blog: 70,
};

const CTR_COLORS: Record<CTRPrediction, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

interface TitleResultCardProps {
  title: GeneratedTitle;
  platform: string;
  onSelect?: (title: string) => void;
  isSelected?: boolean;
}

function TitleResultCard({ title, platform, onSelect, isSelected }: TitleResultCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const limit = PLATFORM_CHAR_LIMITS[platform] ?? 100;
  const isTooLong = title.character_count > limit;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(title.title);
    setCopied(true);
    toast({ title: 'Title copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border p-4 transition-colors',
        isSelected && 'border-primary bg-primary/5',
      )}
    >
      <p className="text-sm font-medium leading-snug">{title.title}</p>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CTR_COLORS[title.ctr_prediction])}>
          {title.ctr_prediction.toUpperCase()} CTR
        </span>

        <span
          className={cn(
            'text-xs',
            isTooLong ? 'text-destructive font-medium' : 'text-green-600 dark:text-green-400',
          )}
        >
          {title.character_count} chars
          {isTooLong ? ` (${title.character_count - limit} over limit)` : ' (optimal)'}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          leftIcon={copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
        {onSelect && (
          <Button
            size="sm"
            variant={isSelected ? 'secondary' : 'outline'}
            onClick={() => onSelect(title.title)}
          >
            {isSelected ? 'Selected' : 'Select for A/B'}
          </Button>
        )}
      </div>
    </div>
  );
}

interface TitleResultsProps {
  titles: GeneratedTitle[];
  platform: string;
  isLoading: boolean;
}

export function TitleResults({ titles, platform, isLoading }: TitleResultsProps) {
  const [selectedTitles, setSelectedTitles] = React.useState<string[]>([]);

  const toggleSelect = (title: string) => {
    setSelectedTitles((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : prev.length < 2
          ? [...prev, title]
          : [prev[1], title],
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (titles.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{titles.length} titles generated</p>
        {selectedTitles.length === 2 && (
          <span className="text-xs text-primary">2 titles selected for A/B compare</span>
        )}
      </div>

      {/* A/B Comparison */}
      {selectedTitles.length === 2 && (
        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <h3 className="text-sm font-semibold">A/B Comparison</h3>
          <div className="grid grid-cols-2 gap-4">
            {selectedTitles.map((title, i) => (
              <div key={i} className="rounded-lg border bg-card p-3">
                <span className="text-xs font-bold text-primary mb-1 block">
                  {i === 0 ? 'Option A' : 'Option B'}
                </span>
                <p className="text-sm">{title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {titles.map((title, i) => (
          <TitleResultCard
            key={i}
            title={title}
            platform={platform}
            onSelect={toggleSelect}
            isSelected={selectedTitles.includes(title.title)}
          />
        ))}
      </div>
    </div>
  );
}
