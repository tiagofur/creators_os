'use client';

import * as React from 'react';
import { useToast } from '@ordo/ui';
import { Button } from '@ordo/ui';
import { Skeleton } from '@ordo/ui';
import { useCreateIdea } from '@/hooks/use-ideas';
import { useWorkspaceStore } from '@ordo/stores';
import { IdeaResultCard } from './idea-result-card';
import type { BrainstormIdea } from '@ordo/types';

interface BrainstormerResultsProps {
  ideas: BrainstormIdea[];
  isLoading: boolean;
  onRegenerate: (idea?: BrainstormIdea) => void;
}

export function BrainstormerResults({
  ideas,
  isLoading,
  onRegenerate,
}: BrainstormerResultsProps) {
  const { toast } = useToast();
  const { mutateAsync: createIdea, isPending: isSavingAll } = useCreateIdea();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id);

  const handleSaveAll = async () => {
    if (!workspaceId) return;
    try {
      await Promise.all(
        ideas.map((idea) =>
          createIdea({
            title: idea.title,
            description: idea.description,
            workspace_id: workspaceId,
          }),
        ),
      );
      toast({ title: `${ideas.length} ideas saved!` });
    } catch {
      toast({ title: 'Failed to save some ideas', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (ideas.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {ideas.length} ideas generated
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRegenerate()}
          >
            Regenerate all
          </Button>
          <Button size="sm" onClick={handleSaveAll} loading={isSavingAll}>
            Save all
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea, i) => (
          <IdeaResultCard
            key={i}
            idea={idea}
            onRegenerate={(idea) => onRegenerate(idea)}
          />
        ))}
      </div>
    </div>
  );
}
