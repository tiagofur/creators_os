'use client';

import * as React from 'react';
import { Checkbox } from '@ordo/ui';
import type { PipelineStage } from '@ordo/types';

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
}

export function StageChecklist({ stage }: StageChecklistProps) {
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const items = STAGE_CHECKLISTS[stage] ?? [];

  const toggle = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
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
