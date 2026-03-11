import { SeriesCard } from './series-card';
import { SeriesListSkeleton } from '@/components/series/series-list-skeleton';
import { EmptyState } from '@/components/empty-state';
import { BookOpen } from 'lucide-react';
import type { Series } from '@ordo/types';

interface SeriesListProps {
  series: Series[];
  isLoading?: boolean;
  onCreateSeries?: () => void;
}

export function SeriesList({ series, isLoading, onCreateSeries }: SeriesListProps) {
  if (isLoading) return <SeriesListSkeleton />;

  if (series.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-10 w-10" />}
        title="No series yet"
        description="Group related content into a series to keep things organized."
        action={{ label: 'Create series', onClick: () => onCreateSeries?.() }}
      />
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {series.map((s) => (
        <SeriesCard key={s.id} series={s} />
      ))}
    </div>
  );
}
