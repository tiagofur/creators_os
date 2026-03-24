'use client';

import * as React from 'react';
import { Star, Copy, RefreshCw } from 'lucide-react';
import { Button, Badge, useToast } from '@ordo/ui';
import { cn } from '@ordo/core';
import { useCreateIdea } from '@/hooks/use-ideas';
import { useWorkspaceStore } from '@ordo/stores';
import type { BrainstormIdea } from '@ordo/types';

interface IdeaResultCardProps {
  idea: BrainstormIdea;
  onRegenerate: (idea: BrainstormIdea) => void;
}

export function IdeaResultCard({ idea, onRegenerate }: IdeaResultCardProps) {
  const { toast } = useToast();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { mutateAsync: createIdea, isPending } = useCreateIdea(workspaceId);

  const handleSave = async () => {
    if (!workspaceId) return;
    try {
      await createIdea({
        title: idea.title,
        description: idea.description,
      });
      toast({ title: 'Idea saved!' });
    } catch {
      toast({ title: 'Failed to save idea', variant: 'destructive' });
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(idea.title);
    toast({ title: 'Title copied to clipboard' });
  };

  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 shadow-sm gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug">{idea.title}</h3>
        <Badge variant="outline" className="shrink-0 capitalize text-xs">
          {idea.platform}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {idea.description}
      </p>

      {/* Virality score */}
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'h-3.5 w-3.5',
              i < idea.virality_score
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground',
            )}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">
          {idea.virality_score}/5 virality
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          loading={isPending}
          className="flex-1"
        >
          Save as Idea
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRegenerate(idea)}
          leftIcon={<RefreshCw className="h-3 w-3" />}
        >
          Regen
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCopy}
          aria-label="Copy title"
          className="h-8 w-8"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
