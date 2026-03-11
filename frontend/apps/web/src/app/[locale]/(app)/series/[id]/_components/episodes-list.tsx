'use client';

import { Plus } from 'lucide-react';
import { Button, Skeleton } from '@ordo/ui';
import { EpisodeCard } from './episode-card';
import { EmptyState } from '@/components/empty-state';
import { BookOpen } from 'lucide-react';
import type { ContentItem } from '@ordo/types';

interface EpisodesListProps {
  episodes: ContentItem[];
  isLoading?: boolean;
  onAddEpisode?: () => void;
}

export function EpisodesList({ episodes, isLoading, onAddEpisode }: EpisodesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">
          Episodes{' '}
          <span className="text-sm text-muted-foreground font-normal">
            ({episodes.length})
          </span>
        </h2>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={onAddEpisode}
        >
          Add episode
        </Button>
      </div>

      {episodes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="No episodes yet"
          description="Add the first episode to this series."
          action={{ label: 'Add episode', onClick: () => onAddEpisode?.() }}
        />
      ) : (
        <div className="space-y-2">
          {episodes.map((episode, index) => (
            <EpisodeCard key={episode.id} episode={episode} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
