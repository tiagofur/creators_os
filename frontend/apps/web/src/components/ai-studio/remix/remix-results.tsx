'use client';

import * as React from 'react';
import { Download } from 'lucide-react';
import { Button, Skeleton } from '@ordo/ui';
import { RemixResultCard } from './remix-result-card';
import type { RemixVariant, AiPlatform } from '@ordo/types';

const PLATFORM_LABELS: Record<AiPlatform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok Reel',
  instagram: 'Instagram Reel',
  twitter: 'Twitter Thread',
  linkedin: 'LinkedIn Post',
  blog: 'Blog Post',
  podcast: 'Podcast Script',
  email: 'Email Newsletter',
};

interface RemixResultsProps {
  variants: RemixVariant[];
  isLoading: boolean;
}

export function RemixResults({ variants, isLoading }: RemixResultsProps) {
  const handleExportAll = () => {
    if (!variants.length) return;
    const content = variants
      .map((v) => `=== ${PLATFORM_LABELS[v.platform]} ===\n\n${v.content}`)
      .join('\n\n' + '='.repeat(40) + '\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'remixed-content.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-4">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-purple-500 animate-pulse" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Remixing your content...
            </p>
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variants.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {variants.length} platform variant{variants.length !== 1 ? 's' : ''} generated
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportAll}
          leftIcon={<Download className="h-3.5 w-3.5" />}
        >
          Export all
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {variants.map((variant, i) => (
          <RemixResultCard key={i} variant={variant} />
        ))}
      </div>
    </div>
  );
}
