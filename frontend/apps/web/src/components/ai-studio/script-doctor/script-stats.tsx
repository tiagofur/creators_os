'use client';

import * as React from 'react';

interface ScriptStatsProps {
  wordCount: number;
  charCount: number;
}

export function ScriptStats({ wordCount, charCount }: ScriptStatsProps) {
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 130));
  const videoDurationMin = Math.max(1, Math.ceil(wordCount / 150));

  return (
    <div className="flex items-center gap-6 border-t px-4 py-2 text-xs text-muted-foreground bg-muted/20">
      <span>
        <strong className="text-foreground">{wordCount.toLocaleString()}</strong> words
      </span>
      <span>
        <strong className="text-foreground">{charCount.toLocaleString()}</strong> chars
      </span>
      <span>
        ~<strong className="text-foreground">{readTimeMin}</strong> min read
      </span>
      <span>
        ~<strong className="text-foreground">{videoDurationMin}</strong> min video
      </span>
    </div>
  );
}
