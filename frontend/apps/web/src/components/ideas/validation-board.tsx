'use client';

import * as React from 'react';
import { cn } from '@ordo/core';
import { Badge, Button, Card, CardContent, Skeleton } from '@ordo/ui';
import { useChangeIdeaStatus } from '@/hooks/use-ideas';
import { useWorkspaceStore } from '@ordo/stores';
import { useToast } from '@ordo/ui';
import type { Idea } from '@ordo/types';

interface ValidationBoardProps {
  ideas: Idea[];
  isLoading?: boolean;
}

function IdeaBoardCard({
  idea,
  onValidate,
  onReject,
  onUnvalidate,
  column,
}: {
  idea: Idea;
  column: 'inbox' | 'validated';
  onValidate: (id: string) => void;
  onReject: (id: string) => void;
  onUnvalidate: (id: string) => void;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        <p className="font-medium leading-snug">{idea.title}</p>

        <div className="flex flex-wrap gap-2">
          {idea.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs capitalize">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          {column === 'inbox' ? (
            <>
              <Button
                size="sm"
                onClick={() => onValidate(idea.id)}
                className="flex-1"
              >
                Validate
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onReject(idea.id)}
              >
                Reject
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUnvalidate(idea.id)}
              className="w-full"
            >
              Move back to inbox
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ValidationBoard({ ideas, isLoading }: ValidationBoardProps) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { mutate: changeStatus } = useChangeIdeaStatus(activeWorkspaceId);
  const { toast } = useToast();

  const inboxIdeas = ideas.filter((i) => i.status === 'inbox');
  const validatedIdeas = ideas.filter((i) => i.status === 'validated');

  const handleValidate = (id: string) => {
    changeStatus({ id, status: 'validated' });
    toast({ title: 'Idea validated!' });
  };

  const handleReject = (id: string) => {
    changeStatus({ id, status: 'archived' });
    toast({ title: 'Idea rejected.' });
  };

  const handleUnvalidate = (id: string) => {
    changeStatus({ id, status: 'inbox' });
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-8 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Inbox column */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">
            Inbox{' '}
            <span className="ml-1 text-sm text-muted-foreground">
              ({inboxIdeas.length})
            </span>
          </h2>
        </div>
        <div className="space-y-3 min-h-[200px] rounded-lg border border-dashed p-3">
          {inboxIdeas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No ideas in inbox
            </p>
          ) : (
            inboxIdeas.map((idea) => (
              <IdeaBoardCard
                key={idea.id}
                idea={idea}
                column="inbox"
                onValidate={handleValidate}
                onReject={handleReject}
                onUnvalidate={handleUnvalidate}
              />
            ))
          )}
        </div>
      </div>

      {/* Validated column */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">
            Validated{' '}
            <span className="ml-1 text-sm text-muted-foreground">
              ({validatedIdeas.length})
            </span>
          </h2>
        </div>
        <div className="space-y-3 min-h-[200px] rounded-lg border border-dashed p-3">
          {validatedIdeas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No validated ideas yet
            </p>
          ) : (
            validatedIdeas.map((idea) => (
              <IdeaBoardCard
                key={idea.id}
                idea={idea}
                column="validated"
                onValidate={handleValidate}
                onReject={handleReject}
                onUnvalidate={handleUnvalidate}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
