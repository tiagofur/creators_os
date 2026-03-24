'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { RotateCcw, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@ordo/ui';
import { useChangeIdeaStatus, useDeleteIdea } from '@/hooks/use-ideas';
import { useWorkspaceStore } from '@ordo/stores';
import type { Idea } from '@ordo/types';

interface GraveyardListProps {
  ideas: Idea[];
  isLoading?: boolean;
}

export function GraveyardList({ ideas, isLoading }: GraveyardListProps) {
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace?.id) ?? '';
  const { mutate: changeStatus } = useChangeIdeaStatus(activeWorkspaceId);
  const { mutateAsync: deleteIdea, isPending: isDeleting } = useDeleteIdea(activeWorkspaceId);
  const { toast } = useToast();

  const handleResurrect = (id: string) => {
    changeStatus({ id, status: 'inbox' });
    toast({ title: 'Idea restored to inbox!' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteIdea(deleteTarget);
      toast({ title: 'Idea permanently deleted.' });
      setDeleteTarget(null);
    } catch {
      toast({ title: 'Failed to delete idea', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <p className="text-center py-12 text-muted-foreground">
        No ideas in the graveyard.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {ideas.map((idea) => (
          <Card key={idea.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{idea.title}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant="secondary"
                    className="text-xs capitalize"
                  >
                    {idea.status}
                  </Badge>
                  <span>
                    {formatDistanceToNow(new Date(idea.updated_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<RotateCcw className="h-3 w-3" />}
                  onClick={() => handleResurrect(idea.id)}
                >
                  Resurrect
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  leftIcon={<Trash2 className="h-3 w-3" />}
                  onClick={() => setDeleteTarget(idea.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The idea will be removed forever.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isDeleting}
              onClick={handleDelete}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
