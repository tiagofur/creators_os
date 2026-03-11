import { Badge } from '@ordo/ui';
import { GripVertical } from 'lucide-react';
import type { ContentItem } from '@ordo/types';

interface EpisodeCardProps {
  episode: ContentItem;
  index: number;
}

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea',
  scripting: 'Scripting',
  recording: 'Recording',
  editing: 'Editing',
  review: 'Review',
  publishing: 'Publishing',
};

export function EpisodeCard({ episode, index }: EpisodeCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="w-6 shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{episode.title}</p>
        {episode.platform && (
          <p className="text-xs text-muted-foreground capitalize">{episode.platform}</p>
        )}
      </div>

      <Badge variant="secondary" className="shrink-0 capitalize">
        {STAGE_LABELS[episode.pipeline_stage] ?? episode.pipeline_stage}
      </Badge>
    </div>
  );
}
