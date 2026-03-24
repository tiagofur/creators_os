'use client';

import * as React from 'react';
import { Checkbox } from '@ordo/ui';
import { useUpdateContent } from '@/hooks/use-content';
import type { ContentItem, PipelineStage } from '@ordo/types';

const STAGE_CHECKLISTS: Record<PipelineStage, string[]> = {
  idea: ['Define the core concept', 'Identify target audience', 'Research competitors'],
  scripting: ['Write outline', 'Write full script', 'Get feedback on script'],
  recording: ['Set up equipment', 'Record footage/audio', 'Capture B-roll'],
  editing: ['Rough cut', 'Add titles and graphics', 'Color grade', 'Audio mix'],
  review: ['Internal review', 'Apply feedback', 'Final approval'],
  publishing: ['Upload to platform', 'Write description/caption', 'Schedule or publish', 'Share to socials'],
};

interface StageChecklistProps {
  stage: PipelineStage;
  contentItem?: ContentItem;
}

export function StageChecklist({ stage, contentItem }: StageChecklistProps) {
  const { mutate: updateContent } = useUpdateContent();

  // Initialize checked state from persisted metadata if available
  const initialChecked = React.useMemo(() => {
    const persisted = contentItem?.metadata as Record<string, unknown> | null | undefined;
    const checklist = persisted?.checklist as Record<string, Record<string, boolean>> | undefined;
    return checklist?.[stage] ?? {};
  }, [contentItem?.metadata, stage]);

  const [checked, setChecked] = React.useState<Record<string, boolean>>(initialChecked);

  // Sync state when contentItem metadata or stage changes externally
  React.useEffect(() => {
    const persisted = contentItem?.metadata as Record<string, unknown> | null | undefined;
    const checklist = persisted?.checklist as Record<string, Record<string, boolean>> | undefined;
    setChecked(checklist?.[stage] ?? {});
  }, [contentItem?.metadata, stage]);

  // Debounced save ref
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistChecklist = React.useCallback(
    (newChecked: Record<string, boolean>) => {
      if (!contentItem) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        const existingMetadata = (contentItem.metadata ?? {}) as Record<string, unknown>;
        const existingChecklist = (existingMetadata.checklist ?? {}) as Record<string, Record<string, boolean>>;

        updateContent({
          id: contentItem.id,
          metadata: {
            ...existingMetadata,
            checklist: {
              ...existingChecklist,
              [stage]: newChecked,
            },
          },
        });
      }, 300);
    },
    [contentItem, stage, updateContent],
  );

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const items = STAGE_CHECKLISTS[stage] ?? [];

  const toggle = (item: string) => {
    setChecked((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      persistChecklist(next);
      return next;
    });
  };

  const completedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Stage checklist
        </p>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{items.length}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <label key={item} className="flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={Boolean(checked[item])}
              onCheckedChange={() => toggle(item)}
            />
            <span className={checked[item] ? 'line-through text-muted-foreground' : ''}>
              {item}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
