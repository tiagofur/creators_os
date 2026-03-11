import * as React from 'react';
import { Lightbulb, FileText, BookOpen, Briefcase, DollarSign } from 'lucide-react';
import type { SearchResult, SearchResultType } from '@ordo/types';

const TYPE_ICONS: Record<SearchResultType, React.ComponentType<{ className?: string }>> = {
  idea: Lightbulb,
  content: FileText,
  series: BookOpen,
  brand: Briefcase,
  deal: DollarSign,
};

const TYPE_LABELS: Record<SearchResultType, string> = {
  idea: 'Idea',
  content: 'Content',
  series: 'Series',
  brand: 'Brand',
  deal: 'Deal',
};

interface CommandResultItemProps {
  result: SearchResult;
}

export function CommandResultItem({ result }: CommandResultItemProps) {
  const Icon = TYPE_ICONS[result.type] ?? FileText;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium">{result.title}</p>
        {result.subtitle && (
          <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{TYPE_LABELS[result.type]}</span>
    </div>
  );
}
